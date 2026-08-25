import { getPayload } from "payload";
import config from "../payload.config";
import { compileMarkdownToHtml } from "../lib/markdown";

function slug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled"; }

async function main() {
  const payload = await getPayload({ config });

  const exists = await payload.find({ collection: "nodes", where: { slug: { equals: "computer-science" }, type: { equals: "branch" } }, limit: 1, depth: 0, pagination: false } as never);
  if (exists.docs.length) {
    console.log("Demo branch computer-science already exists — skipping seed. Delete it first to re-seed.");
    process.exit(0);
  }

  const md = (html: string) => ({ blockType: "markdown", content: html, compiledHtml: compileMarkdownToHtml(html) });

  const branch = await payload.create({ collection: "nodes", data: { title: "Computer Science", slug: "computer-science", type: "branch", status: "published", orderIndex: 0 } as never, overrideAccess: true } as never).then(d=>(d as {id:string|number}).id);

  const year1 = await payload.create({ collection: "nodes", data: { title: "Year 1", slug: "year-1", type: "year", parent: branch, status: "published", orderIndex: 0 } as never, overrideAccess: true } as never).then(d=>(d as {id:string|number}).id);
  const year2 = await payload.create({ collection: "nodes", data: { title: "Year 2", slug: "year-2", type: "year", parent: branch, status: "published", orderIndex: 1 } as never, overrideAccess: true } as never).then(d=>(d as {id:string|number}).id);

  const python = await payload.create({ collection: "nodes", data: { title: "Python Programming", slug: "python-programming", type: "subject", parent: year1, status: "published", orderIndex: 0 } as never, overrideAccess: true } as never).then(d=>(d as {id:string|number}).id);
  const java = await payload.create({ collection: "nodes", data: { title: "Java Programming", slug: "java-programming", type: "subject", parent: year2, status: "published", orderIndex: 0 } as never, overrideAccess: true } as never).then(d=>(d as {id:string|number}).id);

  const chapters: Array<{ title: string; subjectId: string|number; blocks: unknown[] }> = [
    {
      title: "Python Basics: Syntax and Variables",
      subjectId: python,
      blocks: [
        md(`# Python Basics\n\nWelcome to Python — the language behind data science, web apps, and automation. This chapter covers how Python *looks* and how you store values.`),
        md(`## Variables and Types\n\n\`\`\`python\nname = \"Ada\"\nage = 21\npi = 3.14159\nis_student = True\n\`\`\`\n\nPython figures out the type for you — no \`int\` or \`string\` declaration needed. Use \`type(x)\` to check.`),
        md(`## A mini task\n\nTry this in your editor:\n\n\`\`\`python\nprint(f\"Hi, I am {name} and I am {age}\")\n# What does type(pi) print?\n\`\`\``),
      ],
    },
    {
      title: "Control Flow: if, for, while",
      subjectId: python,
      blocks: [
        md(`# Control Flow\n\nYour code makes decisions with \`if\` and repeats work with \`for\` and \`while\`.`),
        md(`## if / elif / else\n\n\`\`\`python\nscore = 72\nif score >= 90:\n    print(\"A\")\nelif score >= 60:\n    print(\"Pass\")\nelse:\n    print(\"Try again\")\n\`\`\``),
        md(`## Loops\n\n\`\`\`python\nfor i in range(5):\n    print(i)\n\nn = 3\nwhile n > 0:\n    print(n)\n    n -= 1\n\`\`\``),
      ],
    },
    {
      title: "Functions and Modules",
      subjectId: python,
      blocks: [
        md(`# Functions and Modules\n\nA function is a reusable recipe. A module is a file full of recipes.`),
        md(`## Defining functions\n\n\`\`\`python\ndef greet(name):\n    return f\"Hello, {name}!\"\n\nprint(greet(\"Raven\"))\n\`\`\``),
        md(`## Modules\n\n\`\`\`python\nimport math\nprint(math.sqrt(16))\n# or: from math import sqrt\n\`\`\`\n\nTry importing \`random\` and printing a random number.`),
      ],
    },
    {
      title: "Java Basics: Classes and Objects",
      subjectId: java,
      blocks: [
        md(`# Java Basics\n\nJava is object-oriented — everything lives inside a **class**. The simplest program already shows this.`),
        md(`## Your first class\n\n\`\`\`java\npublic class Hello {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, Raven!\");\n    }\n}\n\`\`\`\n\nSave as \`Hello.java\`, compile with \`javac Hello.java\`, run with \`java Hello\`.`),
        md(`## Variables and types\n\n\`\`\`java\nString name = \"Ada\";\nint age = 21;\ndouble pi = 3.14;\nboolean isStudent = true;\n\`\`\`\n\nUnlike Python, Java needs the type up front.`),
      ],
    },
    {
      title: "Object-Oriented Java: Inheritance",
      subjectId: java,
      blocks: [
        md(`# OOP: Inheritance\n\nInheritance lets a class reuse code from another.`),
        md(`## extends in action\n\n\`\`\`java\nclass Animal {\n    void speak() { System.out.println(\"...\"); }\n}\nclass Dog extends Animal {\n    @Override\n    void speak() { System.out.println(\"Woof!\"); }\n}\n\`\`\``),
        md(`## When to use it\n\nUse inheritance when "is-a" applies: a Dog *is an* Animal. Otherwise prefer composition. Try making a \`Cat\` class that extends \`Animal\`.`),
      ],
    },
    {
      title: "Collections and Streams",
      subjectId: java,
      blocks: [
        md(`# Collections and Streams\n\nJava's collections hold many values — \`List\`, \`Set\`, \`Map\`. Streams let you process them fluently.`),
        md(`## A stream example\n\n\`\`\`java\nList<String> names = List.of(\"Ada\", \"Bob\", \"Cara\");\nlong count = names.stream()\n    .filter(n -> n.length() > 3)\n    .count();\nSystem.out.println(count); // 2\n\`\`\``),
        md(`Try filtering names that start with "A" and collecting them into a new list.`),
      ],
    },
  ];

  for (let i = 0; i < chapters.length; i++) {
    const c = chapters[i];
    await payload.create({
      collection: "nodes",
      data: {
        title: c.title,
        slug: slug(c.title),
        type: "chapter",
        parent: c.subjectId,
        status: "published",
        orderIndex: i,
        blocks: c.blocks,
      } as never,
      overrideAccess: true,
    } as never);
    console.log(`Created chapter: ${c.title}`);
  }

  // Rebuild search index
  try { const { writeSearchIndex } = await import("../lib/search"); await writeSearchIndex(payload as never); console.log("Search index rebuilt"); } catch {}

  console.log("\nDone! Browse:");
  console.log("  /computer-science/year-1/python-programming/python-basics-syntax-and-variables");
  console.log("  /computer-science/year-2/java-programming/java-basics-classes-and-objects");
  console.log("Or via /api/raven/nodes?status=published");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
