export const creators = [
  {
    id: "maya",
    name: "Maya Chen",
    initials: "MC",
    role: "Frontend developer",
    location: "Bangkok, Thailand",
    specialty: "Frontend",
    tone: "lilac",
    bio: "Thoughtful interfaces, playful details. I build small websites that make everyday things a little better.",
    stack: ["React", "TypeScript", "CSS"],
    projects: ["flora", "folio"],
  },
  {
    id: "leo",
    name: "Leo Park",
    initials: "LP",
    role: "Full-stack developer",
    location: "Seoul, South Korea",
    specialty: "Full-stack",
    tone: "aqua",
    bio: "From a useful idea to a working product. Building tools with simple interfaces and solid foundations.",
    stack: ["Next.js", "Node.js", "PostgreSQL"],
    projects: ["orbit", "flora"],
  },
  {
    id: "aria",
    name: "Aria Patel",
    initials: "AP",
    role: "Creative developer",
    location: "London, United Kingdom",
    specialty: "Creative dev",
    tone: "peach",
    bio: "A little less ordinary. Experimental portfolios and digital spaces for people with something to say.",
    stack: ["Vue", "JavaScript", "GSAP"],
    projects: ["folio", "orbit"],
  },
];
export const projects = [
  {
    id: "flora",
    title: "Flora storefront",
    type: "E-commerce",
    stack: "React",
    price: "0.5",
    creator: "Maya Chen",
    description:
      "A quiet little storefront for things that grow. Product browsing, search, and a considered cart experience.",
    tone: "aqua",
    features: ["Product search", "Shopping cart", "Product cards"],
  },
  {
    id: "orbit",
    title: "Orbit dashboard",
    type: "Dashboard",
    stack: "Next.js",
    price: "0.8",
    creator: "Leo Park",
    description:
      "An easy-to-read workspace for the numbers that matter. Charts, project activity, and a flexible dashboard layout.",
    tone: "lilac",
    features: ["Analytics charts", "Activity feed", "Dashboard layout"],
  },
  {
    id: "folio",
    title: "Studio portfolio",
    type: "Portfolio",
    stack: "Vue",
    price: "0.3",
    creator: "Aria Patel",
    description:
      "An expressive home for independent work. A project gallery, editorial case studies, and a simple contact page.",
    tone: "peach",
    features: ["Project gallery", "Case studies", "Contact page"],
  },
];
export const faqs = [
  [
    "What does a buyer receive?",
    "The source project as a ZIP, under the creator’s stated license. Buyers handle installation and deployment themselves. Updates in the same listing are included.",
  ],
  [
    "Can people see my source in the demo?",
    "A browser can inspect the HTML, CSS, and JavaScript it receives. The planned source-delivery system will encrypt the complete ZIP before storing it on IPFS and unlock it separately. This preview has no source upload or delivery. Keep backend secrets on your server and out of the ZIP.",
  ],
  [
    "Can buyers resell or build on my work?",
    "You set permission for reselling the original rights separately from selling derivative projects. When derivative sales are allowed, the new work can be sold with source. There are no upstream royalties.",
  ],
  [
    "How does Gemini chat work?",
    "Choose one or more source projects you have permission to use, discuss your requirements, choose a stack, and review the plan before confirming code generation. Trial quota is per account, with no daily reset or credit top-ups.",
  ],
  [
    "Is this using real money?",
    "The hackathon version targets the KEEPHUB Avalanche L1 and PINEM. This page is an interface preview: purchases, IPFS publishing, and AI generation are not connected here yet.",
  ],
];
