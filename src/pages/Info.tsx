import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";

const Info = () => (
  <div className="relative min-h-screen bg-background overflow-hidden">
    <main className="relative z-[1] w-full max-w-lg md:max-w-3xl mx-auto px-[24px] md:px-[44px] pt-[44px] pb-[140px]">
      <div className="flex items-center gap-3 mb-11">
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
