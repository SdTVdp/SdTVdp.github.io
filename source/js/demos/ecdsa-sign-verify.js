"use strict";
(() => {
    const globalFlag = "__sdtvdp_ecdsa_sign_verify_bound__";
    const runtime = window;
    if (runtime[globalFlag]) {
        return;
    }
    runtime[globalFlag] = true;
    const encoder = new TextEncoder();
    const toBase64 = (buffer) => {
        let binary = "";
        const bytes = new Uint8Array(buffer);
        bytes.forEach((value) => {
            binary += String.fromCharCode(value);
        });
        return btoa(binary);
    };
    const tamperMessage = (message) => {
        if (!message) {
            return "tampered message";
        }
        const first = message.charAt(0);
        const replacement = first === "X" ? "Y" : "X";
        return `${replacement}${message.slice(1)}`;
    };
    const render = (root) => {
        root.innerHTML = `
      <div class="demo-card">
        <h3 class="demo-title">ECDSA 签名与验签演示</h3>
        <p class="demo-copy">流程：私钥签名 -> 公钥验签 -> 篡改消息后再次验签。</p>
        <p class="demo-note">这个演示用来强调“签名 != 私钥加密”。签名证明的是消息完整性和签名者持有私钥，而不是用来直接保护正文机密性。</p>
        <label class="demo-field">
          <span class="demo-label">输入消息</span>
          <textarea class="demo-input" data-role="message">hello signature</textarea>
        </label>
        <div class="demo-actions">
          <button class="demo-button" type="button" data-role="run">签名并验证</button>
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
            button.disabled = true;
            output.textContent = "正在生成 ECDSA 密钥对...";
            try {
                const keyPair = await crypto.subtle.generateKey({
                    name: "ECDSA",
                    namedCurve: "P-256",
                }, true, ["sign", "verify"]);
                const originalMessage = input.value;
                const originalBytes = encoder.encode(originalMessage);
                const signature = await crypto.subtle.sign({
                    name: "ECDSA",
                    hash: "SHA-256",
                }, keyPair.privateKey, originalBytes);
                const verifiedOriginal = await crypto.subtle.verify({
                    name: "ECDSA",
                    hash: "SHA-256",
                }, keyPair.publicKey, signature, originalBytes);
                const tamperedMessage = tamperMessage(originalMessage);
                const verifiedTampered = await crypto.subtle.verify({
                    name: "ECDSA",
                    hash: "SHA-256",
                }, keyPair.publicKey, signature, encoder.encode(tamperedMessage));
                output.textContent = [
                    "算法：ECDSA / P-256 / SHA-256",
                    `原始消息：${originalMessage || "(空字符串)"}`,
                    `签名 Base64（截断展示）：${toBase64(signature).slice(0, 160)}...`,
                    `原始消息验签：${verifiedOriginal ? "通过" : "失败"}`,
                    "",
                    `篡改后消息：${tamperedMessage}`,
                    `篡改后验签：${verifiedTampered ? "通过" : "失败"}`,
                ].join("\n");
            }
            catch (error) {
                output.textContent = error instanceof Error ? error.message : String(error);
            }
            finally {
                button.disabled = false;
            }
        });
    };
    const bootAll = () => {
        document
            .querySelectorAll('.crypto-demo[data-demo="ecdsa-sign-verify"]')
            .forEach((root) => boot(root));
    };
    document.addEventListener("DOMContentLoaded", bootAll);
    document.addEventListener("pjax:complete", bootAll);
})();
