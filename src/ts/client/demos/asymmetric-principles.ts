(() => {
  const globalFlag = "__sdtvdp_asymmetric_principles_bound__";
  const runtime = window as unknown as Record<string, boolean>;

  if (runtime[globalFlag]) {
    return;
  }

  runtime[globalFlag] = true;

  type DemoMode = "encrypt" | "sign";
  type FlowStep = {
    actor: string;
    title: string;
    detail: string;
  };
  type DemoModeConfig = {
    label: string;
    summary: string;
    steps: FlowStep[];
  };
  type PrinciplePreset = {
    id: string;
    title: string;
    intro: string;
    note: string;
    publicKeyMeaning: string;
    privateKeyMeaning: string;
    principleLines: string[];
    modes: Record<DemoMode, DemoModeConfig>;
  };

  /*
   * Quick-change interface:
   * 1. In Markdown, set data-preset="lecture-template" / "rsa-lecture" / "ecc-lecture".
   * 2. To add a new algorithm later, copy one preset below and only replace the labels/text.
   * 3. This file is intentionally algorithm-light so it can stay as a reusable classroom template.
   */
  const PRESETS: Record<string, PrinciplePreset> = {
    "lecture-template": {
      id: "lecture-template",
      title: "非对称加密基本流程与原理模板",
      intro: "这个模板用于讲解“为什么要有公钥和私钥、什么时候用加密流程、什么时候用签名流程”。",
      note: "老师如果最后指定算法，只需要新增或改一个 preset，再把文章里的 data-preset 改过去。",
      publicKeyMeaning: "公开给通信方或验证方。通常用于加密、验签，或者参与密钥协商。",
      privateKeyMeaning: "只由持有者自己保管。通常用于解密、签名，或者参与密钥协商。",
      principleLines: [
        "核心不是“两把钥匙都能做一样的事”，而是公钥和私钥承担不同职责。",
        "加密流程强调机密性：别人可以加密，只有持有私钥的人能解开。",
        "签名流程强调真实性和完整性：只有持有私钥的人能签，其他人用公钥验证。",
      ],
      modes: {
        encrypt: {
          label: "机密性流程",
          summary: "适合讲“发送方怎样把消息锁起来，只让接收方打开”。",
          steps: [
            {
              actor: "接收方",
              title: "生成一对密钥",
              detail: "接收方先准备 publicKey / privateKey，其中 privateKey 不外发。",
            },
            {
              actor: "发送方",
              title: "拿到 publicKey",
              detail: "发送方只需要拿到 publicKey，就可以开始面向接收方加密。",
            },
            {
              actor: "发送方",
              title: "加密得到 ciphertext",
              detail: "明文 message 经过 publicKey 处理后得到 ciphertext，旁观者无法直接读懂。",
            },
            {
              actor: "接收方",
              title: "用 privateKey 解密",
              detail: "接收方用 privateKey 恢复 message，这一步体现“只有我能打开”。",
            },
          ],
        },
        sign: {
          label: "真实性流程",
          summary: "适合讲“为什么签名不是反过来的加密”。",
          steps: [
            {
              actor: "持有者",
              title: "生成一对密钥",
              detail: "持有者准备 publicKey / privateKey，并把 publicKey 提供给验证方。",
            },
            {
              actor: "持有者",
              title: "对消息做签名",
              detail: "持有者用 privateKey 对 message 生成 signature，证明消息来自自己。",
            },
            {
              actor: "验证方",
              title: "拿到 message + signature",
              detail: "验证方不需要私钥，只需要 publicKey、消息和签名值。",
            },
            {
              actor: "验证方",
              title: "验签判断是否通过",
              detail: "如果消息被篡改，或者签名不是对应私钥生成的，验证就会失败。",
            },
          ],
        },
      },
    },
    "rsa-lecture": {
      id: "rsa-lecture",
      title: "RSA 讲解模板",
      intro: "这个 preset 用于你确认老师要讲 RSA 之后，快速把通用模板切成 RSA 版本。",
      note: "如果需要进一步区分 RSA-OAEP 和 RSA-PSS，可以在后面继续拆更细的 preset。",
      publicKeyMeaning: "RSA 公钥常用于加密或验签。课堂里可以把它理解成“公开锁”。",
      privateKeyMeaning: "RSA 私钥常用于解密或签名。课堂里可以把它理解成“只有持有者知道的钥匙”。",
      principleLines: [
        "RSA 加密和 RSA 签名是两类不同用途，不要混成“私钥加密 = 签名”。",
        "RSA 更适合处理短消息、摘要或会话密钥，不适合直接加密长正文。",
        "真实系统里，RSA 常和 AES-GCM 一起组成混合加密。",
      ],
      modes: {
        encrypt: {
          label: "RSA 加密流程",
          summary: "把 RSA 放在“公钥加密短消息或会话密钥”的位置来讲最稳。",
          steps: [
            {
              actor: "Bob",
              title: "生成 RSA 密钥对",
              detail: "Bob 生成 RSA publicKey / privateKey，并只公开 publicKey。",
            },
            {
              actor: "Alice",
              title: "使用 Bob 的 publicKey",
              detail: "Alice 拿到 Bob 的 publicKey 后，可以把短消息或会话密钥加密给 Bob。",
            },
            {
              actor: "Alice",
              title: "得到密文",
              detail: "加密后输出 ciphertext，旁观者即使拿到也不能直接恢复原文。",
            },
            {
              actor: "Bob",
              title: "使用 privateKey 解密",
              detail: "Bob 用自己的 privateKey 恢复原文，完成机密性链路。",
            },
          ],
        },
        sign: {
          label: "RSA 签名流程",
          summary: "强调签名常对消息摘要进行，而不是把原文整个“倒着加密”。",
          steps: [
            {
              actor: "Alice",
              title: "准备 RSA 密钥对",
              detail: "Alice 公开 publicKey，自己保管 privateKey。",
            },
            {
              actor: "Alice",
              title: "生成 signature",
              detail: "Alice 用 privateKey 对消息摘要生成 signature。",
            },
            {
              actor: "Bob",
              title: "拿到 publicKey",
              detail: "Bob 使用 Alice 的 publicKey 检查 signature 是否对应当前消息。",
            },
            {
              actor: "Bob",
              title: "判定是否通过",
              detail: "消息一旦被改动，或者签名不对应这把私钥，验证就会失败。",
            },
          ],
        },
      },
    },
    "ecc-lecture": {
      id: "ecc-lecture",
      title: "椭圆曲线讲解模板",
      intro: "这个 preset 用于你想把课堂重点放在 ECDSA / ECDH 一类算法时使用。",
      note: "ECC 家族里“签名”和“协商”更常见，直接拿来讲公钥加密时要说明算法背景。",
      publicKeyMeaning: "ECC 公钥通常用于验签或参与共享密钥计算。",
      privateKeyMeaning: "ECC 私钥通常用于签名或参与共享密钥计算。",
      principleLines: [
        "ECC 更像一个算法家族，常见用途包括签名、密钥交换和身份认证。",
        "课堂上如果只讲 ECDSA，可以把重点放在“签名与验签”而不是“直接公钥加密”。",
        "如果讲 ECDH，则可以自然过渡到“协商共享密钥，再交给对称算法处理正文”。",
      ],
      modes: {
        encrypt: {
          label: "协商共享密钥",
          summary: "更贴近 ECDH 的真实用法：先协商共享密钥，再用对称算法加密正文。",
          steps: [
            {
              actor: "通信双方",
              title: "各自生成 ECC 密钥对",
              detail: "双方各自保留私钥，并交换各自的公钥。",
            },
            {
              actor: "双方",
              title: "计算共享密钥",
              detail: "双方使用自己的私钥和对方的公钥，计算出同一个共享秘密。",
            },
            {
              actor: "发送方",
              title: "导出会话密钥并加密",
              detail: "共享秘密通常经过派生后变成对称加密密钥，用来加密正文。",
            },
            {
              actor: "接收方",
              title: "用同一会话密钥解密",
              detail: "接收方得到同一个会话密钥后，就能解开正文。",
            },
          ],
        },
        sign: {
          label: "ECDSA 签名流程",
          summary: "椭圆曲线签名常用于强调“消息没被篡改，而且签名来自对应私钥”。",
          steps: [
            {
              actor: "持有者",
              title: "准备 ECDSA 密钥对",
              detail: "持有者公开 publicKey，私钥只保留在本地。",
            },
            {
              actor: "持有者",
              title: "对消息摘要签名",
              detail: "签名值证明这条消息对应持有者手里的 privateKey。",
            },
            {
              actor: "验证方",
              title: "拿到公钥和签名",
              detail: "验证方不用知道私钥，只需检查签名和消息是否匹配。",
            },
            {
              actor: "验证方",
              title: "发现篡改就失败",
              detail: "消息内容只要被动过，验签结果就会改变。",
            },
          ],
        },
      },
    },
  };

  const render = (root: HTMLElement, preset: PrinciplePreset): void => {
    root.innerHTML = `
      <div class="demo-card">
        <h3 class="demo-title">${preset.title}</h3>
        <p class="demo-copy">${preset.intro}</p>
        <p class="demo-note">${preset.note}</p>
        <div class="demo-grid">
          <section class="demo-panel">
            <h4 class="demo-panel-title">publicKey 通常负责什么</h4>
            <p class="demo-panel-copy">${preset.publicKeyMeaning}</p>
          </section>
          <section class="demo-panel">
            <h4 class="demo-panel-title">privateKey 通常负责什么</h4>
            <p class="demo-panel-copy">${preset.privateKeyMeaning}</p>
          </section>
        </div>
        <ul class="demo-list" data-role="principles"></ul>
        <div class="demo-tabs" data-role="tabs">
          <button class="demo-tab" type="button" data-mode="encrypt"></button>
          <button class="demo-tab" type="button" data-mode="sign"></button>
        </div>
        <div class="demo-flow" data-role="flow"></div>
        <div class="demo-actions">
          <button class="demo-button" type="button" data-role="prev">上一步</button>
          <button class="demo-button" type="button" data-role="next">下一步</button>
          <button class="demo-button" type="button" data-role="reset">重置流程</button>
        </div>
        <pre class="demo-output" data-role="output"></pre>
      </div>
    `;
  };

  const boot = (root: HTMLElement): void => {
    if (root.dataset.ready === "1") {
      return;
    }

    root.dataset.ready = "1";

    const presetName = root.dataset.preset || "lecture-template";
    const preset = PRESETS[presetName] || PRESETS["lecture-template"];
    render(root, preset);

    const principles = root.querySelector<HTMLElement>('[data-role="principles"]');
    const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>(".demo-tab"));
    const flow = root.querySelector<HTMLElement>('[data-role="flow"]');
    const output = root.querySelector<HTMLElement>('[data-role="output"]');
    const prevButton = root.querySelector<HTMLButtonElement>('[data-role="prev"]');
    const nextButton = root.querySelector<HTMLButtonElement>('[data-role="next"]');
    const resetButton = root.querySelector<HTMLButtonElement>('[data-role="reset"]');

    if (!principles || !flow || !output || !prevButton || !nextButton || !resetButton || tabs.length !== 2) {
      return;
    }

    principles.innerHTML = preset.principleLines.map((line) => `<li>${line}</li>`).join("");

    let mode: DemoMode = "encrypt";
    let currentStep = 0;

    const paint = (): void => {
      const modeConfig = preset.modes[mode];

      tabs.forEach((tab) => {
        const tabMode = tab.dataset.mode as DemoMode;
        tab.textContent = preset.modes[tabMode].label;
        tab.classList.toggle("is-active", tabMode === mode);
      });

      flow.innerHTML = modeConfig.steps
        .map((step, index) => {
          const classes = [
            "demo-step",
            index === currentStep ? "is-active" : "",
            index < currentStep ? "is-done" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return `
            <section class="${classes}">
              <span class="demo-step-index">步骤 ${index + 1} / ${modeConfig.steps.length} · ${step.actor}</span>
              <strong class="demo-step-title">${step.title}</strong>
              <p class="demo-step-copy">${step.detail}</p>
            </section>
          `;
        })
        .join("");

      const activeStep = modeConfig.steps[currentStep];
      output.textContent = [
        `当前模式：${modeConfig.label}`,
        `讲解提示：${modeConfig.summary}`,
        "",
        `当前步骤：${activeStep.title}`,
        `角色：${activeStep.actor}`,
        activeStep.detail,
        "",
        `切换接口：data-preset="${preset.id}"`,
      ].join("\n");

      prevButton.disabled = currentStep === 0;
      nextButton.disabled = currentStep === modeConfig.steps.length - 1;
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const nextMode = tab.dataset.mode as DemoMode;
        mode = nextMode;
        currentStep = 0;
        paint();
      });
    });

    prevButton.addEventListener("click", () => {
      if (currentStep > 0) {
        currentStep -= 1;
        paint();
      }
    });

    nextButton.addEventListener("click", () => {
      const modeConfig = preset.modes[mode];
      if (currentStep < modeConfig.steps.length - 1) {
        currentStep += 1;
        paint();
      }
    });

    resetButton.addEventListener("click", () => {
      currentStep = 0;
      paint();
    });

    paint();
  };

  const bootAll = (): void => {
    document
      .querySelectorAll<HTMLElement>('.crypto-demo[data-demo="asymmetric-principles"]')
      .forEach((root) => boot(root));
  };

  document.addEventListener("DOMContentLoaded", bootAll);
  document.addEventListener("pjax:complete", bootAll);
})();
