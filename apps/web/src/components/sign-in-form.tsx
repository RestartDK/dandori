import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
import { Chrome } from "lucide-react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

import Loader from "./loader";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "./ui/field";
import { Input } from "./ui/input";

export default function SignInForm({
  className,
  onSwitchToSignUp,
  ...props
}: React.ComponentProps<"div"> & {
  onSwitchToSignUp?: () => void;
}) {
  const navigate = useNavigate();
  const { isPending } = authClient.useSession();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            navigate({ to: "/" });
            toast.success("Sign in successful");
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        }
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  if (isPending) {
    return <Loader />;
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
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
              <form.Field name="email">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="m@example.com"
                      type="email"
                      value={field.state.value}
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>

              <form.Field name="password">
                {(field) => (
                  <Field>
                    <div className="flex items-center">
                      <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                      <a
                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                        href="#"
                      >
                        Forgot your password?
                      </a>
                    </div>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="password"
                      value={field.state.value}
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>

              <Field>
                <form.Subscribe>
                  {(state) => (
                    <Button
                      disabled={!state.canSubmit || state.isSubmitting}
                      type="submit"
                    >
                      {state.isSubmitting ? "Signing in..." : "Login"}
                    </Button>
                  )}
                </form.Subscribe>
                <Button type="button" variant="outline">
                  <Chrome />
                  Login with Google
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                  {onSwitchToSignUp ? (
                    <button
                      className="underline underline-offset-4"
                      onClick={onSwitchToSignUp}
                      type="button"
                    >
                      Sign up
                    </button>
                  ) : (
                    <Link to="/login">Sign up</Link>
                  )}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
