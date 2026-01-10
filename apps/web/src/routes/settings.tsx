import { useForm } from "@tanstack/react-form";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import z from "zod";

import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/settings")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
  },
  component: SettingsComponent,
});

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function SettingsComponent() {
  const { data: session, isPending } = authClient.useSession();
  const { theme, setTheme } = useTheme();

  const form = useForm({
    defaultValues: {
      name: session?.user.name ?? "",
      image: session?.user.image ?? "",
    },
    onSubmit: async ({ value }) => {
      await authClient.updateUser(
        {
          name: value.name,
          image: value.image || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Profile updated successfully");
          },
          onError: (error) => {
            toast.error(error.error.message || "Failed to update profile");
          },
        }
      );
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        image: z.string().url("Must be a valid URL").or(z.literal("")),
      }),
    },
  });

  if (isPending || !session) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const user = session.user;

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="font-semibold text-2xl">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and profile information.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update your personal information and profile picture.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <div className="flex items-center gap-4 pb-2">
                <Avatar size="lg">
                  <AvatarImage
                    alt={user.name}
                    src={form.state.values.image || user.image || undefined}
                  />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-base">{user.name}</p>
                  <p className="text-muted-foreground text-xs">{user.email}</p>
                </div>
              </div>

              <form.Field name="name">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Your name"
                      value={field.state.value}
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>

              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input disabled value={user.email} />
                <p className="text-muted-foreground text-xs">
                  Email cannot be changed.
                </p>
              </Field>

              <form.Field name="image">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      Profile Image URL
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      type="url"
                      value={field.state.value}
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>

              <div className="flex justify-end pt-2">
                <form.Subscribe>
                  {(state) => (
                    <Button
                      disabled={!state.canSubmit || state.isSubmitting}
                      type="submit"
                    >
                      {state.isSubmitting ? "Saving..." : "Save changes"}
                    </Button>
                  )}
                </form.Subscribe>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize the appearance of the application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => setTheme("light")}
              variant={theme === "light" ? "default" : "outline"}
            >
              <Sun className="mr-2 size-4" />
              Light
            </Button>
            <Button
              className="flex-1"
              onClick={() => setTheme("dark")}
              variant={theme === "dark" ? "default" : "outline"}
            >
              <Moon className="mr-2 size-4" />
              Dark
            </Button>
            <Button
              className="flex-1"
              onClick={() => setTheme("system")}
              variant={theme === "system" ? "default" : "outline"}
            >
              <Monitor className="mr-2 size-4" />
              System
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
