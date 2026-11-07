import type { Metadata } from "next";
import LoginScreen from "@/components/LoginScreen";

export const metadata: Metadata = {
  title: "Masuk · Nganre",
};

export default function LoginPage() {
  return <LoginScreen />;
}
