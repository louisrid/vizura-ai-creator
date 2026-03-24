import { Button } from "@/components/ui/button";

const PricingSection = () => {
  return (
    <section className="bg-background py-22">
      <div className="container max-w-3xl text-center">
        <h2 className="text-display-sm mb-10">simple pricing</h2>
        <div className="border-2 border-foreground p-10 md:p-14">
          <p className="text-body-lg text-muted-foreground mb-6">start creating today</p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 mb-10">
            <div>
              <span className="text-display-sm">$7</span>
              <p className="text-muted-foreground font-semibold mt-1">first month</p>
            </div>
            <div className="hidden md:block w-px h-20 bg-border" />
            <div>
              <span className="text-display-sm">$20</span>
              <p className="text-muted-foreground font-semibold mt-1">/month after</p>
            </div>
          </div>
          <p className="text-muted-foreground mb-8">unlimited generations · 3 angles per character · cancel anytime</p>
          <Button size="xl" variant="hero">subscribe now</Button>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
