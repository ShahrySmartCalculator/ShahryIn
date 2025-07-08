"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      // Update this route to redirect to an authenticated route. The user already has an active session.
      router.push("/protected");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className={cn("flex flex-col gap-6 rtl", className)} dir="rtl" {...props}>
      <Card className="max-w-md w-full mx-auto shadow-md">
        <CardHeader className="text-right">
          <CardTitle className="text-2xl font-bold text-blue-700">
            إعادة تعيين كلمة المرور
          </CardTitle>
          <CardDescription className="text-sm text-gray-600">
            يرجى إدخال كلمة مرور جديدة أدناه
          </CardDescription>
        </CardHeader>
  
        <CardContent>
          <form onSubmit={handleForgotPassword} className="space-y-6">
            {/* New Password */}
            <div className="grid gap-2 text-right">
              <Label htmlFor="password">كلمة المرور الجديدة</Label>
              <Input
                id="password"
                type="password"
                placeholder="كلمة المرور الجديدة"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-right"
              />
            </div>
  
            {/* Error Message */}
            {error && (
              <p className="text-sm text-red-500 text-right">{error}</p>
            )}
  
            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "جارٍ الحفظ..." : "حفظ كلمة المرور الجديدة"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
  