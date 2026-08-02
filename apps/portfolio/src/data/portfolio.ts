export const profile = {
  name: "Xin (Ethan) Li",
  role: "AI Software Engineer",
  location: "Cork, Ireland",
  email: "xin.ethan.li@gmail.com",
  github: "https://github.com/Xin-Ethan-Li",
  resumeRequest: "mailto:xin.ethan.li@gmail.com?subject=Resume%20request",
  accentColor: "#1d4ed8",
  summary:
    "Software Engineer with 5+ years of backend experience, focused on integrating ML, retrieval and LLM capabilities into reliable enterprise workflows.",
  about:
    "I build production-minded AI systems where models, retrieval, APIs and observability work as one coherent product. My backend foundation in Node.js and TypeScript shapes how I approach Python, ML and RAG: with explicit contracts, measurable quality, controlled failure modes and honest system boundaries.",
};

export const skills = [
  "RAG",
  "LLM integration",
  "XGBoost",
  "TypeScript",
  "Node.js",
  "Python",
  "Fastify",
  "FastAPI",
  "PostgreSQL",
  "Redis",
  "RabbitMQ",
  "AWS",
  "Docker",
  "Terraform",
  "CI/CD",
] as const;

export const projects = [
  {
    slug: "supplier-risk-intelligence",
    number: "01",
    title: "Supplier Risk Intelligence",
    category: "AI engineering case study",
    description:
      "An explainable risk workflow combining XGBoost, hybrid retrieval, evidence-bound summaries and observable APIs.",
    tags: ["XGBoost", "RAG", "FastAPI", "Fastify", "Astro"],
    caseStudy: true,
    demo: "https://srm-supplier-risk-demo.onrender.com/demo/",
    code: "https://github.com/Xin-Ethan-Li/supplier-risk-intelligence",
  },
  {
    slug: "scm-order-inventory",
    number: "02",
    title: "Cloud-native SCM Backend",
    category: "Distributed backend",
    description:
      "An event-driven order and inventory service with durable messaging, documented APIs and infrastructure as code.",
    tags: ["Node.js", "RabbitMQ", "PostgreSQL", "Terraform"],
    caseStudy: false,
    code: "https://github.com/Xin-Ethan-Li/scm-order-inventory-backend",
  },
  {
    slug: "ecommerce-architecture",
    number: "03",
    title: "E-commerce Architecture",
    category: "Transaction systems",
    description:
      "A full-stack payment workflow focused on idempotent webhooks, trusted state transitions and testable boundaries.",
    tags: ["TypeScript", "Express", "Redis", "Stripe"],
    caseStudy: false,
    code: "https://github.com/Xin-Ethan-Li/Full-Stack-E-commerce-Architecture",
  },
] as const;

export const capabilities = [
  {
    index: "01",
    title: "AI systems",
    text: "RAG, LLM integration, XGBoost, vector retrieval and evidence-grounded workflows.",
  },
  {
    index: "02",
    title: "Backend engineering",
    text: "TypeScript, Node.js, Python, Fastify, FastAPI and event-driven service design.",
  },
  {
    index: "03",
    title: "Production delivery",
    text: "AWS, Docker, Terraform, CI/CD, observability and pragmatic reliability controls.",
  },
] as const;

export const experience = [
  {
    company: "Elitesland Software System",
    title: "Software Engineer",
    dateRange: "Nov 2021 — Present",
    bullets: [
      "Built backend services and applied-AI workflows across supplier risk, document processing and production diagnostics.",
      "Developed Node.js and Fastify services, Python ML pipelines, retrieval systems and observable API integrations.",
      "Owned testing, API documentation, release workflows and production support in a remote engineering environment.",
    ],
  },
  {
    company: "VIP.com",
    title: "Software Engineer",
    dateRange: "Feb 2020 — Oct 2021",
    bullets: [
      "Built e-commerce transaction flows and asynchronous payment integrations using TypeScript, Node.js and React.",
      "Improved webhook consistency through backend reconciliation and idempotent state handling.",
      "Expanded integration testing and ELK-based production diagnostics for critical payment paths.",
    ],
  },
] as const;

export const education = [
  {
    school: "University College Cork, Ireland",
    degree: "MSc in Computer Science",
    dateRange: "Graduated Dec 2025",
    achievements: [
      "Advanced computer science study with an applied software-engineering focus.",
    ],
  },
  {
    school: "Dalian Jiaotong University, China",
    degree: "BSc in Computer Science",
    dateRange: "Bachelor's degree",
    achievements: ["Foundation in computer science and software development."],
  },
] as const;
