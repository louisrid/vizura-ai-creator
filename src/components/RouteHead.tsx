import { Helmet } from "react-helmet-async";
import { useLocation, useParams } from "react-router-dom";

const SITE = "https://facebox.dev";

type Meta = { title: string; description: string };

const META: Record<string, Meta> = {
  "/": {
    title: "facebox: the all-in-one AI girl studio",
    description: "facebox — the all-in-one AI girl studio. Create stunning, consistent AI girls with multiple angles and bodies in seconds.",
  },
  "/auth": {
    title: "log in — facebox",
    description: "log in to facebox to access your AI girl studio, characters, and photo storage.",
  },
  "/reset-password": {
    title: "reset password — facebox",
    description: "reset your facebox account password to get back into your AI girl studio.",
  },
  "/generate-face": {
    title: "generate face — facebox",
    description: "generate a brand new AI face for your facebox character in seconds.",
  },
  "/choose-face": {
    title: "choose face — facebox",
    description: "pick the perfect AI-generated face for your facebox character.",
  },
  "/create": {
    title: "create photo — facebox",
    description: "create a new AI photo of your facebox character with custom poses and angles.",
  },
  "/index": {
    title: "create photo — facebox",
    description: "create a new AI photo of your facebox character with custom poses and angles.",
  },
  "/characters": {
    title: "my characters — facebox",
    description: "browse and manage all your AI characters created with facebox.",
  },
  "/storage": {
    title: "storage — facebox",
    description: "all your generated facebox photos in one place, ready to download.",
  },
  "/video": {
    title: "video — facebox",
    description: "AI video face-swap with facebox — coming soon.",
  },
  "/top-ups": {
    title: "gems — facebox",
    description: "top up your facebox gems to keep generating AI photos and characters.",
  },
  "/account": {
    title: "my account — facebox",
    description: "manage your facebox account, subscription, and preferences.",
  },
  "/help": {
    title: "help — facebox",
    description: "get help and support for using facebox, the all-in-one AI girl studio.",
  },
  "/history": {
    title: "history — facebox",
    description: "view your full facebox generation history across every character.",
  },
  "/info": {
    title: "info — facebox",
    description: "terms, privacy, and information about facebox.",
  },
  "/admin": {
    title: "admin — facebox",
    description: "facebox admin tools.",
  },
};

const FALLBACK: Meta = {
  title: "facebox: the all-in-one AI girl studio",
  description: "facebox — the all-in-one AI girl studio. Create stunning, consistent AI girls in seconds.",
};

const RouteHead = () => {
  const location = useLocation();
  const params = useParams();
  let path = location.pathname;
  let meta = META[path];

  if (!meta && path.startsWith("/characters/")) {
    meta = {
      title: "character — facebox",
      description: "view and manage this facebox character — face, angles, and body shots.",
    };
    path = "/characters/" + (params.id ?? "");
  }
  if (!meta) meta = FALLBACK;

  const url = SITE + path;
  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
    </Helmet>
  );
};

export default RouteHead;
