"use strict";
(() => {
    const globalFlag = "__sdtvdp_rsa_oaep_encrypt_bound__";
    const runtime = window;
    if (runtime[globalFlag]) {
        return;
    }
    runtime[globalFlag] = true;
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const MAX_RSA_OAEP_BYTES = 190;
    const toBase64 = (buffer) => {
        let binary = "";
        const bytes = new Uint8Array(buffer);
        bytes.forEach((value) => {
            binary += String.fromCharCode(value);
        });
        return btoa(binary);
    };
    const truncateMiddle = (value, limit) => {
        if (value.length <= limit) {
            return value;
        }
        const head = Math.floor(limit / 2);
        const tail = Math.max(0, limit - head - 3);
        return `${value.slice(0, head)}...${value.slice(value.length - tail)}`;
    };
    const setPending = (button, output, message) => {
        button.disabled = true;
        output.textContent = message;
    };
    const restoreButton = (button) => {
        button.disabled = false;
    };
    const render = (root) => {
        root.innerHTML = `
      <div class="demo-card">
        <h3 class="demo-title">RSA-OAEP 短消息加密演示</h3>
        <p class="demo-copy">流程：生成公私钥对 -> 公钥加密 -> 私钥解密。</p>
        <p class="demo-note">这里的 RSA-OAEP 只用于演示短消息加密。真实系统通常使用混合加密：正文用 AES-GCM，加密对称密钥时才使用 RSA-OAEP。</p>
        <label class="demo-field">
          <span class="demo-label">输入短消息</span>
          <textarea class="demo-input" data-role="message">hello public key</textarea>
        </label>
        <div class="demo-actions">
          <button class="demo-button" type="button" data-role="run">生成密钥并演示</button>
        </div>
        <pre class="demo-output" data-role="output">点击按钮开始演示。</pre>
      </div>
    `;
    };
    const boot = (root) => {
        if (root.dataset.ready === "1") {
            return;
        }
        root.dataset.ready = "1";
        render(root);
        const input = root.querySelector('[data-role="message"]');
        const output = root.querySelector('[data-role="output"]');
        const button = root.querySelector('[data-role="run"]');
        if (!input || !output || !button) {
            return;
        }
        button.addEventListener("click", async () => {
            const plainBytes = encoder.encode(input.value);
            if (plainBytes.byteLength > MAX_RSA_OAEP_BYTES) {
                output.textContent =
                    `当前消息长度为 ${plainBytes.byteLength} 字节，超过 2048 位 RSA-OAEP（SHA-256）示例的安全演示范围。\n请缩短到 ${MAX_RSA_OAEP_BYTES} 字节以内，或改用后续的混合加密演示。`;
                return;
            }
            setPending(button, output, "正在生成 RSA-OAEP 密钥对...");
            try {
                const keyPair = await crypto.subtle.generateKey({
                    name: "RSA-OAEP",
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256",
                }, true, ["encrypt", "decrypt"]);
                output.textContent = "正在使用公钥加密...";
                const ciphertext = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, keyPair.publicKey, plainBytes);
                output.textContent = "正在使用私钥解密...";
                const decrypted = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, keyPair.privateKey, ciphertext);
                const cipherBase64 = toBase64(ciphertext);
                output.textContent = [
                    "算法：RSA-OAEP / SHA-256 / 2048 bits",
                    `明文字节数：${plainBytes.byteLength}`,
                    `密文字节数：${ciphertext.byteLength}`,
                    `密文 Base64（截断展示）：${truncateMiddle(cipherBase64, 160)}`,
                    "",
                    `解密结果：${decoder.decode(decrypted)}`,
                ].join("\n");
            }
            catch (error) {
                output.textContent = error instanceof Error ? error.message : String(error);
            }
            finally {
                restoreButton(button);
            }
        });
    };
    const bootAll = () => {
        document
            .querySelectorAll('.crypto-demo[data-demo="rsa-oaep-encrypt"]')
            .forEach((root) => boot(root));
    };
    document.addEventListener("DOMContentLoaded", bootAll);
    document.addEventListener("pjax:complete", bootAll);
})();
