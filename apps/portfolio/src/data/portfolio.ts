export const profile = {
  name: "Xin (Ethan) Li",
  role: "AI Software Engineer",
  location: "Cork, Ireland",
  email: "xin.ethan.li@gmail.com",
  github: "https://github.com/Xin-Ethan-Li",
  resumeRequest: "mailto:xin.ethan.li@gmail.com?subject=Resume%20request",
};

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
