import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import PricingSection from "@/components/PricingSection";
import SocialProof from "@/components/SocialProof";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="bg-nav py-22 md:py-30">
        <div className="container max-w-4xl text-center">
          <h1 className="text-display-sm md:text-display text-nav-foreground mb-8">
            create beautiful ai characters in seconds
          </h1>
          <p className="text-nav-foreground/60 text-body-lg max-w-2xl mx-auto mb-12">
            describe a character. get 3 perfectly consistent angles — front, left, and right. ready for games, comics, or concept art.
          </p>
          <Link to="/generate">
            <Button size="xl" variant="hero-outline">
              try 1 free generation
            </Button>
          </Link>
        </div>
      </section>

      <PricingSection />
      <SocialProof />

      {/* Footer */}
      <footer className="bg-nav py-10">
        <div className="container text-center">
          <p className="text-nav-foreground/40 font-semibold lowercase">© 2026 vizura. all rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
