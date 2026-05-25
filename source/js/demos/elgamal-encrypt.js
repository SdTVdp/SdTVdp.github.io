"use strict";
(() => {
    const globalFlag = "__sdtvdp_elgamal_encrypt_bound__";
    const runtime = window;
    if (runtime[globalFlag]) {
        return;
    }
    runtime[globalFlag] = true;
    const DEFAULTS = {
        p: 509,
        g: 449,
        x: 12,
        k: 18,
        m1: 123,
        m2: 407,
        givenC1: 231,
        givenC2: 492,
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
    const getUniquePrimeFactors = (value) => {
        const factors = [];
        let rest = value;
        let divisor = 2;
        while (divisor <= rest / divisor) {
            if (rest % divisor === 0) {
                factors.push(divisor);
                while (rest % divisor === 0) {
                    rest = Math.floor(rest / divisor);
                }
            }
            divisor = divisor === 2 ? 3 : divisor + 2;
        }
        if (rest > 1) {
            factors.push(rest);
        }
        return factors;
    };
    const isGenerator = (g, p) => {
        if (g <= 1 || g >= p) {
            return false;
        }
        const order = p - 1;
        return getUniquePrimeFactors(order).every((factor) => modPow(g, order / factor, p) !== 1);
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
            g: parseInteger(getInput("g"), "g"),
            x: parseInteger(getInput("x"), "x"),
            k: parseInteger(getInput("k"), "k"),
            m1: parseInteger(getInput("m1"), "m1"),
            m2: parseInteger(getInput("m2"), "m2"),
            givenC1: parseInteger(getInput("given-c1"), "给定 c1"),
            givenC2: parseInteger(getInput("given-c2"), "给定 c2"),
        };
    };
    const computeElGamal = (params) => {
        const { p, g, x, k, m1, m2, givenC1, givenC2 } = params;
        if (!isPrime(p)) {
            throw new Error("p 必须是素数。");
        }
        if (p < 3) {
            throw new Error("p 至少需要为 3。");
        }
        if (!isGenerator(g, p)) {
            throw new Error("g 必须是模 p 乘法群的生成元。");
        }
        if (x < 1 || x > p - 2) {
            throw new Error("私钥 x 必须满足 1 <= x <= p - 2。");
        }
        if (k < 1 || k > p - 2) {
            throw new Error("随机数 k 必须满足 1 <= k <= p - 2。");
        }
        if (m1 < 1 || m1 >= p || m2 < 1 || m2 >= p) {
            throw new Error("明文 m1 和 m2 必须满足 1 <= m < p。");
        }
        if (givenC1 < 1 || givenC1 >= p || givenC2 < 0 || givenC2 >= p) {
            throw new Error("给定密文必须满足 1 <= c1 < p 且 0 <= c2 < p。");
        }
        const y = modPow(g, x, p);
        const c1 = modPow(g, k, p);
        const sharedMask = modPow(y, k, p);
        const c2M1 = (m1 * sharedMask) % p;
        const c2M2 = (m2 * sharedMask) % p;
        const givenShared = modPow(givenC1, x, p);
        const givenInverse = modInverse(givenShared, p);
        if (givenInverse === null) {
            throw new Error("无法计算共享秘密的模逆。");
        }
        const decryptedGiven = (givenC2 * givenInverse) % p;
        return {
            ...params,
            y,
            c1,
            sharedMask,
            c2M1,
            c2M2,
            givenShared,
            givenInverse,
            decryptedGiven,
            steps: [
                `1. 计算公钥 y=g^x mod p=${g}^${x} mod ${p}=${y}。`,
                `2. 使用一次性随机数 k=${k}，得到 c1=g^k mod p=${c1}。`,
                `3. 计算共享掩码 s=y^k mod p=${sharedMask}。`,
                `4. 加密 m1：c2=${m1}*${sharedMask} mod ${p}=${c2M1}，密文为 (${c1},${c2M1})。`,
                `5. 加密 m2：c2=${m2}*${sharedMask} mod ${p}=${c2M2}，密文为 (${c1},${c2M2})。`,
                `6. 解密给定密文：s'=${givenC1}^${x} mod ${p}=${givenShared}，s'^{-1}=${givenInverse}，m=${givenC2}*${givenInverse} mod ${p}=${decryptedGiven}。`,
            ],
        };
    };
    const render = (root) => {
        root.innerHTML = `
      <div class="demo-card">
        <h3 class="demo-title">ElGamal 加密动画</h3>
        <p class="demo-copy">按照实验四参数演示 ElGamal：p=509，g=449，x=12，k=18。</p>
        <p class="demo-note">ElGamal 每次加密都需要新的随机 k；这里为了复现实验结果，默认固定 k=18。</p>
        <div class="demo-number-grid">
          <label class="demo-mini-field">p <input class="demo-number-input" data-role="p" type="number" value="${DEFAULTS.p}"></label>
          <label class="demo-mini-field">g <input class="demo-number-input" data-role="g" type="number" value="${DEFAULTS.g}"></label>
          <label class="demo-mini-field">x <input class="demo-number-input" data-role="x" type="number" value="${DEFAULTS.x}"></label>
          <label class="demo-mini-field">k <input class="demo-number-input" data-role="k" type="number" value="${DEFAULTS.k}"></label>
          <label class="demo-mini-field">m1 <input class="demo-number-input" data-role="m1" type="number" value="${DEFAULTS.m1}"></label>
          <label class="demo-mini-field">m2 <input class="demo-number-input" data-role="m2" type="number" value="${DEFAULTS.m2}"></label>
          <label class="demo-mini-field">给定 c1 <input class="demo-number-input" data-role="given-c1" type="number" value="${DEFAULTS.givenC1}"></label>
          <label class="demo-mini-field">给定 c2 <input class="demo-number-input" data-role="given-c2" type="number" value="${DEFAULTS.givenC2}"></label>
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
                ["public y", result.y],
                ["c1", result.c1],
                ["y^k mod p", result.sharedMask],
                ["m1 cipher", `(${result.c1},${result.c2M1})`],
                ["m2 cipher", `(${result.c1},${result.c2M2})`],
                ["Decrypt given", result.decryptedGiven],
            ];
            summary.innerHTML = summaryItems
                .map(([label, value]) => `<span class="demo-kv"><strong>${label}</strong><span>${value}</span></span>`)
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
                "ElGamal 结果对照",
                `Public key  (p,g,y)=(${result.p},${result.g},${result.y})`,
                `Private key x=${result.x}`,
                `m1=${result.m1} -> (${result.c1},${result.c2M1})`,
                `m2=${result.m2} -> (${result.c1},${result.c2M2})`,
                `given (${result.givenC1},${result.givenC2}) -> m=${result.decryptedGiven}`,
            ].join("\n");
            prevButton.disabled = currentStep === 0;
            nextButton.disabled = currentStep === result.steps.length - 1;
        };
        const run = () => {
            try {
                result = computeElGamal(readParams(root));
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
            .querySelectorAll('.crypto-demo[data-demo="elgamal-encrypt"]')
            .forEach((root) => boot(root));
    };
    document.addEventListener("DOMContentLoaded", bootAll);
    document.addEventListener("pjax:complete", bootAll);
})();
