import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Code2,
  ExternalLink,
  GitFork,
  Globe,
  Mail,
  Phone,
  XCircle,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import {
  contact,
  howToUse,
  links,
  projectInfo,
  techStack,
  whatToExpect,
  whatToNotExpect,
  whyBuilt,
} from "./constants";

export default function AboutPage() {
  return (
    <div className="min-h-dvh overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>

        <header className="mb-10 space-y-3">
          <Badge variant="secondary" className="mb-1">
            About
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {projectInfo.name}
          </h1>
          <p className="text-muted-foreground text-lg">{projectInfo.tagline}</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {projectInfo.description}
          </p>
        </header>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="size-4" />
              {whyBuilt.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {whyBuilt.body}
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="size-4" />
              Tech stack
            </CardTitle>
            <CardDescription>
              Built with a modern, type-safe, end-to-end stack.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {techStack.map((tech) => (
              <Badge key={tech.name} variant="outline" size="lg">
                {tech.name}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="size-4" />
              Links
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {links.map((link) =>
              link.placeholder ? (
                <span
                  key={link.label}
                  className="text-muted-foreground inline-flex items-center gap-2 text-sm"
                >
                  {link.label === "Repository" ? (
                    <GitFork className="size-4" />
                  ) : (
                    <Globe className="size-4" />
                  )}
                  {link.href}
                </span>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-foreground hover:text-primary inline-flex items-center gap-2 text-sm underline underline-offset-4"
                >
                  <BookOpen className="size-4" />
                  {link.label}
                  <ExternalLink className="size-3.5" />
                </Link>
              ),
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>How to use</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-muted-foreground list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
              {howToUse.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        <div className="mb-8 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="text-success size-4" />
              What to expect
            </h3>
            <ul className="space-y-1.5">
              {whatToExpect.map((item) => (
                <li
                  key={item}
                  className="text-muted-foreground flex items-start gap-2 text-sm"
                >
                  <CheckCircle2 className="text-success mt-0.5 size-3.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
              <XCircle className="text-destructive size-4" />
              What not to expect
            </h3>
            <ul className="space-y-1.5">
              {whatToNotExpect.map((item) => (
                <li
                  key={item}
                  className="text-muted-foreground flex items-start gap-2 text-sm"
                >
                  <XCircle className="text-destructive mt-0.5 size-3.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-4" />
              Contact
            </CardTitle>
            <CardDescription>{contact.note}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <span className="text-muted-foreground inline-flex items-center gap-2">
              <Mail className="size-4" />
              {contact.email}
            </span>
            <span className="text-muted-foreground inline-flex items-center gap-2">
              <Phone className="size-4" />
              {contact.phone}
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}