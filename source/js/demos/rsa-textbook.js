"use strict";
(() => {
    const globalFlag = "__sdtvdp_rsa_textbook_bound__";
    const runtime = window;
    if (runtime[globalFlag]) {
        return;
    }
    runtime[globalFlag] = true;
    const DEFAULTS = {
        p: 11,
        q: 13,
        e: 7,
        m1: 85,
        m2: 91,
        givenCipher: 123,
    };
    const isPrime = (value) => {
        if (!Number.isInteger(value) || value < 2) {
            return false;
        }
        if (value === 2 || value === 3) {
            return true;
        }
        if (value % 2 === 0 || value % 3 === 0) {
            return false;
        }
        for (let factor = 5; factor <= value / factor; factor += 6) {
            if (value % factor === 0 || value % (factor + 2) === 0) {
                return false;
            }
        }
        return true;
    };
    const gcd = (a, b) => {
        let left = Math.abs(a);
        let right = Math.abs(b);
        while (right !== 0) {
            const next = left % right;
            left = right;
            right = next;
        }
        return left;
    };
    const extendedGcd = (a, b) => {
        if (b === 0) {
            return { gcd: a, x: 1, y: 0 };
        }
        const next = extendedGcd(b, a % b);
        return {
            gcd: next.gcd,
            x: next.y,
            y: next.x - Math.trunc(a / b) * next.y,
        };
    };
    const modInverse = (value, modulus) => {
        const result = extendedGcd(value, modulus);
        if (result.gcd !== 1) {
            return null;
        }
        return ((result.x % modulus) + modulus) % modulus;
    };
    const modPow = (base, exponent, modulus) => {
        let result = 1 % modulus;
        let factor = ((base % modulus) + modulus) % modulus;
        let power = exponent;
        while (power > 0) {
            if (power & 1) {
                result = (result * factor) % modulus;
            }
            factor = (factor * factor) % modulus;
            power = Math.floor(power / 2);
        }
        return result;
    };
    const parseInteger = (input, label) => {
        const value = Number(input.value.trim());
        if (!Number.isInteger(value)) {
            throw new Error(`${label} 必须是整数。`);
        }
        return value;
    };
    const readParams = (root) => {
        const getInput = (role) => {
            const input = root.querySelector(`[data-role="${role}"]`);
            if (!input) {
                throw new Error(`缺少输入框：${role}`);
            }
            return input;
        };
        return {
            p: parseInteger(getInput("p"), "p"),
            q: parseInteger(getInput("q"), "q"),
            e: parseInteger(getInput("e"), "e"),
            m1: parseInteger(getInput("m1"), "m1"),
            m2: parseInteger(getInput("m2"), "m2"),
            givenCipher: parseInteger(getInput("given-cipher"), "给定密文"),
        };
    };
    const computeRsa = (params) => {
        const { p, q, e, m1, m2, givenCipher } = params;
        if (!isPrime(p) || !isPrime(q)) {
            throw new Error("p 和 q 必须都是素数。");
        }
        if (p === q) {
            throw new Error("p 和 q 应当取不同素数。");
        }
        const n = p * q;
        const phi = (p - 1) * (q - 1);
        if (e <= 1 || e >= phi) {
            throw new Error("e 必须满足 1 < e < phi(n)。");
        }
        if (gcd(e, phi) !== 1) {
            throw new Error("e 必须与 phi(n) 互素，否则无法计算私钥 d。");
        }
        if (m1 < 0 || m1 >= n || m2 < 0 || m2 >= n || givenCipher < 0 || givenCipher >= n) {
            throw new Error("m1、m2 和给定密文都需要满足 0 <= value < n。");
        }
        const d = modInverse(e, phi);
        if (d === null) {
            throw new Error("无法计算 d=e^{-1} mod phi(n)。");
        }
        const c1 = modPow(m1, e, n);
        const c2 = modPow(m2, e, n);
        const decryptedGiven = modPow(givenCipher, d, n);
        const checkM1 = modPow(c1, d, n);
        const checkM2 = modPow(c2, d, n);
        return {
            ...params,
            n,
            phi,
            d,
            c1,
            c2,
            decryptedGiven,
            checkM1,
            checkM2,
            steps: [
                `1. 计算 n=p*q=${p}*${q}=${n}，phi(n)=(${p}-1)*(${q}-1)=${phi}。`,
                `2. 求私钥指数 d，使 e*d ≡ 1 (mod phi(n))，得到 d=${d}。`,
                `3. 加密 m1：c1=${m1}^${e} mod ${n}=${c1}。`,
                `4. 加密 m2：c2=${m2}^${e} mod ${n}=${c2}。`,
                `5. 解密给定密文：m=${givenCipher}^${d} mod ${n}=${decryptedGiven}。`,
                `6. 复核：${c1}^${d} mod ${n}=${checkM1}，${c2}^${d} mod ${n}=${checkM2}。`,
            ],
        };
    };
    const render = (root) => {
        root.innerHTML = `
      <div class="demo-card">
        <h3 class="demo-title">RSA 教材版模幂动画</h3>
        <p class="demo-copy">按照实验四参数演示 RSA 密钥生成、加密和解密：p=11，q=13，e=7。</p>
        <p class="demo-note">这里故意使用小整数，目的是和作业、main.c 输出、手算过程完全对齐；它不是生产级 RSA。</p>
        <div class="demo-number-grid">
          <label class="demo-mini-field"><span class="demo-mini-label">p</span><input class="demo-number-input" data-role="p" type="number" value="${DEFAULTS.p}"></label>
          <label class="demo-mini-field"><span class="demo-mini-label">q</span><input class="demo-number-input" data-role="q" type="number" value="${DEFAULTS.q}"></label>
          <label class="demo-mini-field"><span class="demo-mini-label">e</span><input class="demo-number-input" data-role="e" type="number" value="${DEFAULTS.e}"></label>
          <label class="demo-mini-field"><span class="demo-mini-label">m1</span><input class="demo-number-input" data-role="m1" type="number" value="${DEFAULTS.m1}"></label>
          <label class="demo-mini-field"><span class="demo-mini-label">m2</span><input class="demo-number-input" data-role="m2" type="number" value="${DEFAULTS.m2}"></label>
          <label class="demo-mini-field"><span class="demo-mini-label">给定密文</span><input class="demo-number-input" data-role="given-cipher" type="number" value="${DEFAULTS.givenCipher}"></label>
        </div>
        <div class="demo-actions">
          <button class="demo-button" type="button" data-role="run">重新计算</button>
          <button class="demo-button" type="button" data-role="prev">上一步</button>
          <button class="demo-button" type="button" data-role="next">下一步</button>
        </div>
        <div class="demo-kv-grid" data-role="summary"></div>
        <div class="demo-flow" data-role="flow"></div>
        <pre class="demo-output" data-role="output"></pre>
      </div>
    `;
    };
    const boot = (root) => {
        if (root.dataset.ready === "1") {
            return;
        }
        root.dataset.ready = "1";
        render(root);
        const runButton = root.querySelector('[data-role="run"]');
        const prevButton = root.querySelector('[data-role="prev"]');
        const nextButton = root.querySelector('[data-role="next"]');
        const summary = root.querySelector('[data-role="summary"]');
        const flow = root.querySelector('[data-role="flow"]');
        const output = root.querySelector('[data-role="output"]');
        if (!runButton || !prevButton || !nextButton || !summary || !flow || !output) {
            return;
        }
        let result = null;
        let currentStep = 0;
        const paint = () => {
            if (!result) {
                return;
            }
            const summaryItems = [
                ["n", result.n],
                ["phi(n)", result.phi],
                ["d", result.d],
                ["c1", result.c1],
                ["c2", result.c2],
                ["Decrypt y", result.decryptedGiven],
            ];
            summary.innerHTML = summaryItems
                .map(([label, value]) => `<span class="demo-kv"><strong>${label}</strong><span class="demo-kv-value">${value}</span></span>`)
                .join("");
            flow.innerHTML = result.steps
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
              <span class="demo-step-index">步骤 ${index + 1} / ${result.steps.length}</span>
              <p class="demo-step-copy">${step}</p>
            </section>
          `;
            })
                .join("");
            output.textContent = [
                "RSA 结果对照",
                `Public key  (e,n)=(${result.e},${result.n})`,
                `Private key (d,n)=(${result.d},${result.n})`,
                `m1=${result.m1} -> c1=${result.c1}`,
                `m2=${result.m2} -> c2=${result.c2}`,
                `given y=${result.givenCipher} -> m=${result.decryptedGiven}`,
            ].join("\n");
            prevButton.disabled = currentStep === 0;
            nextButton.disabled = currentStep === result.steps.length - 1;
        };
        const run = () => {
            try {
                result = computeRsa(readParams(root));
                currentStep = 0;
                paint();
            }
            catch (error) {
                result = null;
                summary.innerHTML = "";
                flow.innerHTML = "";
                output.textContent = error instanceof Error ? error.message : String(error);
                prevButton.disabled = true;
                nextButton.disabled = true;
            }
        };
        runButton.addEventListener("click", run);
        prevButton.addEventListener("click", () => {
            if (currentStep > 0) {
                currentStep -= 1;
                paint();
            }
        });
        nextButton.addEventListener("click", () => {
            if (result && currentStep < result.steps.length - 1) {
                currentStep += 1;
                paint();
            }
        });
        run();
    };
    const bootAll = () => {
        document
            .querySelectorAll('.crypto-demo[data-demo="rsa-textbook"]')
            .forEach((root) => boot(root));
    };
    document.addEventListener("DOMContentLoaded", bootAll);
    document.addEventListener("pjax:complete", bootAll);
})();
