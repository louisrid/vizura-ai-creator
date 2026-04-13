import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import DotDecal from "@/components/DotDecal";

const Info = () => (
  <div className="relative min-h-screen bg-background overflow-hidden">
    <DotDecal />
    <main className="relative z-[1] w-full max-w-lg md:max-w-3xl mx-auto px-4 md:px-10 pt-10 pb-[280px]">
      <div className="flex items-center gap-3 mb-7">
        <BackButton />
        <PageTitle className="mb-0">info</PageTitle>
      </div>
      <p className="text-sm font-extrabold lowercase text-white">
        terms &amp; privacy — coming soon
      </p>
    </main>
  </div>
);

export default Info;
