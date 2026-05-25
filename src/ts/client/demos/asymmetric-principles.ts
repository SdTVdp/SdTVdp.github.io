(() => {
  const globalFlag = "__sdtvdp_asymmetric_principles_bound__";
  const runtime = window as unknown as Record<string, boolean>;

  if (runtime[globalFlag]) {
    return;
  }

  runtime[globalFlag] = true;

  type DemoMode = "workflow" | "lab";
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

  const escapeHtml = (value: string): string =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const PRESETS: Record<string, PrinciplePreset> = {
    "public-key-core": {
      id: "public-key-core",
      title: "非对称加密基本流程：公钥公开，私钥保密",
      intro: "这张卡只保留公钥密码体制的骨架：接收方生成密钥对，发送方用公钥加密，接收方用私钥解密。",
      note: "RSA 和 ElGamal 的数学细节不同，但课堂讲解时都不能破坏这条主线：公钥负责开放入口，私钥负责唯一解开。",
      publicKeyMeaning: "可以公开给发送方。发送方拿到公钥后，只能把明文变成密文，不能反推出私钥。",
      privateKeyMeaning: "只由接收方保存。解密能力来自私钥，因此私钥泄露就等于失去机密性边界。",
      principleLines: [
        "非对称加密解决的是“没有预共享密钥时，怎样让别人安全地把消息发给我”。",
        "公钥和私钥不是两把能随便互换的钥匙，而是承担不同方向的数学职责。",
        "实验参数很小，适合手算和动画演示；真实系统必须使用大整数、填充、随机数和成熟库。",
      ],
      modes: {
        workflow: {
          label: "通用加密流程",
          summary: "先把角色关系讲清楚，再进入 RSA 和 ElGamal 的具体公式。",
          steps: [
            {
              actor: "接收方",
              title: "生成一对关联密钥",
              detail: "接收方先得到 publicKey / privateKey，并只把 publicKey 公开出去。",
            },
            {
              actor: "发送方",
              title: "拿到接收方的公钥",
              detail: "发送方不需要知道私钥，只要确认这把公钥确实属于接收方。",
            },
            {
              actor: "发送方",
              title: "用公钥加密明文",
              detail: "明文 message 经过公钥算法得到 ciphertext，旁观者只能看到密文。",
            },
            {
              actor: "接收方",
              title: "用私钥恢复明文",
              detail: "接收方使用 privateKey 解密 ciphertext，恢复出原始 message。",
            },
          ],
        },
        lab: {
          label: "实验映射",
          summary: "把通用流程映射到这次实验里的 RSA 和 ElGamal 参数。",
          steps: [
            {
              actor: "RSA",
              title: "公钥是 (e, n)，私钥是 (d, n)",
              detail: "实验中 p=11、q=13、e=7，计算 n=143、phi(n)=120、d=103。",
            },
            {
              actor: "RSA",
              title: "加密和解密都是模幂",
              detail: "加密 c=m^e mod n；解密 m=c^d mod n。平方乘法用于减少模幂运算量。",
            },
            {
              actor: "ElGamal",
              title: "公钥是 (p, g, y)，私钥是 x",
              detail: "实验中 p=509、g=449、x=12，公钥 y=g^x mod p=438。",
            },
            {
              actor: "ElGamal",
              title: "每次加密都需要随机 k",
              detail: "密文是 (c1,c2)=(g^k mod p, m*y^k mod p)。k 不能复用，否则会泄露结构信息。",
            },
          ],
        },
      },
    },
    "rsa-elgamal-lab": {
      id: "rsa-elgamal-lab",
      title: "RSA 与 ElGamal 实验讲解模板",
      intro: "这一版直接对齐实验四：先保留非对称加密的公共流程，再把 RSA 和 ElGamal 的公式、参数、结果放到同一张卡里比较。",
      note: "模板优化后的重点不是再给未来算法留空位，而是让作业题、源码和动画互相印证。",
      publicKeyMeaning: "RSA 中是 (e,n)=(7,143)；ElGamal 中是 (p,g,y)=(509,449,438)。它们都可以交给发送方。",
      privateKeyMeaning: "RSA 中是 (d,n)=(103,143)；ElGamal 中是 x=12。它们必须由接收方保存。",
      principleLines: [
        "RSA 的陷门来自模 n 上的指数互逆关系，d 是 e 关于 phi(n) 的模逆。",
        "ElGamal 的陷门来自离散对数困难性，公开 y=g^x mod p 不应暴露 x。",
        "两者都依赖快速模幂；实验里的平方乘法正是这部分的核心实现。",
      ],
      modes: {
        workflow: {
          label: "共同流程",
          summary: "先看两种算法都遵守的公钥加密流程。",
          steps: [
            {
              actor: "接收方",
              title: "生成密钥材料",
              detail: "RSA 生成 p、q、e、d；ElGamal 选择 p、g、x 并计算 y。",
            },
            {
              actor: "发送方",
              title: "只拿公开参数",
              detail: "RSA 发送方只用 (e,n)；ElGamal 发送方只用 (p,g,y) 和一次性随机数 k。",
            },
            {
              actor: "发送方",
              title: "输出密文",
              detail: "RSA 输出单个数 c；ElGamal 输出一对数 (c1,c2)，因为需要携带 g^k。",
            },
            {
              actor: "接收方",
              title: "使用私钥解密",
              detail: "RSA 用 d 做模幂；ElGamal 用 x 还原共享秘密并乘上模逆。",
            },
          ],
        },
        lab: {
          label: "题目结果",
          summary: "用动画前先把 docx 和 main.c 的确定结果列出来。",
          steps: [
            {
              actor: "RSA",
              title: "m1=85 加密得到 123",
              detail: "85^7 mod 143 = 123；给定密文 y=123 解密后也得到 85。",
            },
            {
              actor: "RSA",
              title: "m2=91 加密得到 130",
              detail: "91^7 mod 143 = 130；再用 d=103 解密可恢复 91。",
            },
            {
              actor: "ElGamal",
              title: "m1=123 加密得到 (231,483)",
              detail: "k=18 时 c1=449^18 mod 509=231，c2=123*438^18 mod 509=483。",
            },
            {
              actor: "ElGamal",
              title: "m2=407 加密得到 (231,394)",
              detail: "同一组实验参数下，给定密文 (231,492) 解密得到明文 100。",
            },
          ],
        },
      },
    },
  };

  const render = (root: HTMLElement, preset: PrinciplePreset): void => {
    root.innerHTML = `
      <div class="demo-card">
        <h3 class="demo-title">${escapeHtml(preset.title)}</h3>
        <p class="demo-copy">${escapeHtml(preset.intro)}</p>
        <p class="demo-note">${escapeHtml(preset.note)}</p>
        <div class="demo-grid">
          <section class="demo-panel">
            <h4 class="demo-panel-title">publicKey / 公钥</h4>
            <p class="demo-panel-copy">${escapeHtml(preset.publicKeyMeaning)}</p>
          </section>
          <section class="demo-panel">
            <h4 class="demo-panel-title">privateKey / 私钥</h4>
            <p class="demo-panel-copy">${escapeHtml(preset.privateKeyMeaning)}</p>
          </section>
        </div>
        <ul class="demo-list" data-role="principles"></ul>
        <div class="demo-tabs" data-role="tabs">
          <button class="demo-tab" type="button" data-mode="workflow"></button>
          <button class="demo-tab" type="button" data-mode="lab"></button>
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

    const presetName = root.dataset.preset || "public-key-core";
    const preset = PRESETS[presetName] || PRESETS["public-key-core"];
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

    principles.innerHTML = preset.principleLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");

    let mode: DemoMode = "workflow";
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
              <span class="demo-step-index">步骤 ${index + 1} / ${modeConfig.steps.length} · ${escapeHtml(step.actor)}</span>
              <strong class="demo-step-title">${escapeHtml(step.title)}</strong>
              <p class="demo-step-copy">${escapeHtml(step.detail)}</p>
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
