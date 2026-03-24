const testimonials = [
  { name: "alex m.", text: "the fastest character tool i've ever used. insane quality." },
  { name: "jordan k.", text: "replaced my entire concept art pipeline with vizura." },
  { name: "sam r.", text: "3 angles in seconds. absolute game changer." },
];

const SocialProof = () => {
  return (
    <section className="bg-nav py-22">
      <div className="container max-w-4xl">
        <h2 className="text-display-sm text-nav-foreground text-center mb-14">what creators say</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div key={t.name} className="border border-nav-foreground/20 p-8">
              <p className="text-nav-foreground/80 text-body-lg mb-6">"{t.text}"</p>
              <p className="text-nav-foreground font-extrabold lowercase">— {t.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
