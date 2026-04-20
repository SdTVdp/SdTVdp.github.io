(() => {
  const globalFlag = "__sdtvdp_hybrid_encryption_bound__";
  const runtime = window as unknown as Record<string, boolean>;

  if (runtime[globalFlag]) {
    return;
  }

  runtime[globalFlag] = true;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  type HybridDemoResult = {
    summaryLines: string[];
    stepLines: string[];
    restoredMessage: string;
  };
  type HybridAdapter = {
    id: string;
    title: string;
    intro: string;
    note: string;
    asymmetricLabel: string;
    symmetricLabel: string;
    sessionKeyLabel: string;
    run: (message: string, root: HTMLElement) => Promise<HybridDemoResult>;
  };

  const toBase64 = (buffer: ArrayBuffer): string => {
    let binary = "";
    const bytes = new Uint8Array(buffer);

    bytes.forEach((value) => {
      binary += String.fromCharCode(value);
    });

    return btoa(binary);
  };

  const truncateMiddle = (value: string, limit: number): string => {
    if (value.length <= limit) {
      return value;
    }

    const head = Math.floor(limit / 2);
    const tail = Math.max(0, limit - head - 3);
    return `${value.slice(0, head)}...${value.slice(value.length - tail)}`;
  };

  /*
   * Quick-change interface:
   * 1. In Markdown, choose data-adapter="template-generic" or "rsa-oaep-aes-gcm".
   * 2. For a new algorithm, add one adapter below and point data-adapter to it.
   * 3. For the generic template, you can override title/labels with:
   *    data-template-title / data-asymmetric-label / data-symmetric-label / data-session-key-label
   */
  const ADAPTERS: Record<string, HybridAdapter> = {
    "template-generic": {
      id: "template-generic",
      title: "混合加密流程模板",
      intro: "这个模板不绑定某个具体算法，适合你上课前最后确认讲 RSA、ECIES、ECDH 还是别的方案。",
      note: "这张卡只负责把流程讲清楚：先处理正文，再保护会话密钥。要落到具体算法时，改 data-adapter 或新增 adapter 即可。",
      asymmetricLabel: "待确认公钥算法",
      symmetricLabel: "待确认对称算法",
      sessionKeyLabel: "会话密钥",
      run: async (message: string, root: HTMLElement) => {
        const title = root.dataset.templateTitle || "混合加密流程模板";
        const asymmetricLabel = root.dataset.asymmetricLabel || "待确认公钥算法";
        const symmetricLabel = root.dataset.symmetricLabel || "待确认对称算法";
        const sessionKeyLabel = root.dataset.sessionKeyLabel || "会话密钥";

        return {
          summaryLines: [
            `模板标题：${title}`,
            `公钥部分：${asymmetricLabel}`,
            `对称部分：${symmetricLabel}`,
            `核心载荷：${sessionKeyLabel}`,
          ],
          stepLines: [
            `1. 随机生成 ${sessionKeyLabel}。`,
            `2. 用 ${symmetricLabel} 加密正文 message，得到 ciphertext。`,
            `3. 用 ${asymmetricLabel} 保护 ${sessionKeyLabel}，得到 wrappedKey。`,
            `4. 接收方先恢复 ${sessionKeyLabel}，再用 ${symmetricLabel} 解开正文。`,
            `5. 课堂讲解时可以继续补充“真实性”部分，例如签名或证书。`,
          ],
          restoredMessage: message,
        };
      },
    },
    "rsa-oaep-aes-gcm": {
      id: "rsa-oaep-aes-gcm",
      title: "RSA-OAEP + AES-GCM 混合加密演示",
      intro: "这是一个可运行的浏览器端实例：正文交给 AES-GCM，会话密钥交给 RSA-OAEP。",
      note: "它更接近真实系统的思路，也正好能解释为什么单纯的 RSA demo 不适合直接加密长正文。",
      asymmetricLabel: "RSA-OAEP",
      symmetricLabel: "AES-GCM",
      sessionKeyLabel: "AES 会话密钥",
      run: async (message: string) => {
        const aesKey = await crypto.subtle.generateKey(
          { name: "AES-GCM", length: 256 },
          true,
          ["encrypt", "decrypt"]
        );

        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await crypto.subtle.encrypt(
          { name: "AES-GCM", iv },
          aesKey,
          encoder.encode(message)
        );

        const rawAesKey = await crypto.subtle.exportKey("raw", aesKey);
        const rsaKeyPair = await crypto.subtle.generateKey(
          {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
          },
          true,
          ["encrypt", "decrypt"]
        );

        const wrappedKey = await crypto.subtle.encrypt(
          { name: "RSA-OAEP" },
          rsaKeyPair.publicKey,
          rawAesKey
        );

        const restoredRawKey = await crypto.subtle.decrypt(
          { name: "RSA-OAEP" },
          rsaKeyPair.privateKey,
          wrappedKey
        );

        const restoredAesKey = await crypto.subtle.importKey(
          "raw",
          restoredRawKey,
          { name: "AES-GCM" },
          false,
          ["decrypt"]
        );

        const restoredPlaintext = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          restoredAesKey,
          ciphertext
        );

        return {
          summaryLines: [
            "算法组合：RSA-OAEP + AES-GCM",
            `IV(Base64)：${toBase64(iv.buffer)}`,
            `会话密钥字节数：${rawAesKey.byteLength}`,
            `正文密文字节数：${ciphertext.byteLength}`,
            `被 RSA 保护后的会话密钥字节数：${wrappedKey.byteLength}`,
          ],
          stepLines: [
            "1. 生成 AES-GCM 会话密钥。",
            "2. 用 AES-GCM 加密正文，得到 ciphertext。",
            "3. 导出原始 AES 会话密钥。",
            "4. 生成 RSA-OAEP 公私钥对。",
            "5. 用 RSA 公钥保护会话密钥，得到 wrappedKey。",
            "6. 用 RSA 私钥恢复会话密钥。",
            "7. 再用恢复出的 AES 会话密钥解开正文。",
            `ciphertext(Base64 预览)：${truncateMiddle(toBase64(ciphertext), 140)}`,
            `wrappedKey(Base64 预览)：${truncateMiddle(toBase64(wrappedKey), 140)}`,
          ],
          restoredMessage: decoder.decode(restoredPlaintext),
        };
      },
    },
  };

  const resolveAdapter = (root: HTMLElement): HybridAdapter => {
    const name = root.dataset.adapter || "template-generic";
    const fallback = ADAPTERS["template-generic"];
    const base = ADAPTERS[name] || fallback;

    if (base.id !== "template-generic") {
      return base;
    }

    return {
      ...base,
      title: root.dataset.templateTitle || base.title,
      asymmetricLabel: root.dataset.asymmetricLabel || base.asymmetricLabel,
      symmetricLabel: root.dataset.symmetricLabel || base.symmetricLabel,
      sessionKeyLabel: root.dataset.sessionKeyLabel || base.sessionKeyLabel,
    };
  };

  const render = (root: HTMLElement, adapter: HybridAdapter): void => {
    root.innerHTML = `
      <div class="demo-card">
        <h3 class="demo-title">${adapter.title}</h3>
        <p class="demo-copy">${adapter.intro}</p>
        <p class="demo-note">${adapter.note}</p>
        <div class="demo-chip-row">
          <span class="demo-chip">公钥部分：${adapter.asymmetricLabel}</span>
          <span class="demo-chip">对称部分：${adapter.symmetricLabel}</span>
          <span class="demo-chip">${adapter.sessionKeyLabel}</span>
        </div>
        <label class="demo-field">
          <span class="demo-label">演示输入</span>
          <textarea class="demo-input" data-role="message">hello hybrid encryption</textarea>
        </label>
        <div class="demo-actions">
          <button class="demo-button" type="button" data-role="run">运行混合加密演示</button>
        </div>
        <p class="demo-meta">切换接口：data-adapter="${adapter.id}"</p>
        <pre class="demo-output" data-role="output">点击按钮后，会在这里显示流程和结果。</pre>
      </div>
    `;
  };

  const boot = (root: HTMLElement): void => {
    if (root.dataset.ready === "1") {
      return;
    }

    root.dataset.ready = "1";

    const adapter = resolveAdapter(root);
    render(root, adapter);

    const input = root.querySelector<HTMLTextAreaElement>('[data-role="message"]');
    const output = root.querySelector<HTMLElement>('[data-role="output"]');
    const button = root.querySelector<HTMLButtonElement>('[data-role="run"]');

    if (!input || !output || !button) {
      return;
    }

    button.addEventListener("click", async () => {
      button.disabled = true;
      output.textContent = "正在准备混合加密演示...";

      try {
        const result = await adapter.run(input.value, root);
        output.textContent = [
          `当前适配器：${adapter.id}`,
          ...result.summaryLines,
          "",
          ...result.stepLines,
          "",
          `最终恢复的明文：${result.restoredMessage}`,
        ].join("\n");
      } catch (error) {
        output.textContent = error instanceof Error ? error.message : String(error);
      } finally {
        button.disabled = false;
      }
    });
  };

  const bootAll = (): void => {
    document
      .querySelectorAll<HTMLElement>('.crypto-demo[data-demo="hybrid-encryption"]')
      .forEach((root) => boot(root));
  };

  document.addEventListener("DOMContentLoaded", bootAll);
  document.addEventListener("pjax:complete", bootAll);
})();
