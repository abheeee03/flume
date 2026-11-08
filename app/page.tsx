import Image from "next/image";
import { Button } from "@/components/glaze/ui/button";

const templatesHref =
  "https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app";
const learnHref =
  "https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app";
const deployHref =
  "https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app";
const docsHref =
  "https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-measure flex-col justify-center gap-6 px-4 py-8">
      <Image
        className="h-5 w-auto"
        src="/next.svg"
        alt="Next.js logo"
        width={100}
        height={20}
        priority
      />
      <div className="shell">
        <div className="panel flex flex-col gap-3 p-3">
          <h1 className="type-title">
            To get started, edit the <code>page.tsx</code> file.
          </h1>
          <p className="type-body text-text-2">
            Looking for a starting point or more instructions? Head over to{" "}
            <a className="text-text-1 underline" href={templatesHref}>
              Templates
            </a>{" "}
            or the{" "}
            <a className="text-text-1 underline" href={learnHref}>
              Learning
            </a>{" "}
            center.
          </p>
        </div>
        <div className="shell-foot">
          <Button
            className="ms-auto"
            size="sm"
            variant="secondary"
            nativeButton={false}
            render={
              <a href={docsHref} target="_blank" rel="noopener noreferrer" />
            }
          >
            Read documentation
          </Button>
          <Button
            size="sm"
            nativeButton={false}
            render={
              <a href={deployHref} target="_blank" rel="noopener noreferrer" />
            }
          >
            Deploy now
          </Button>
        </div>
      </div>
    </main>
  );
}
