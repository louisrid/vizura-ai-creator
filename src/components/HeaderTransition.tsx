import Header from "@/components/Header";

/**
 * HeaderTransition — now a simple pass-through.
 * The header is rendered inside the same animated wrapper as page content
 * in App.tsx, so it fades together with the page. No independent opacity.
 */
const HeaderTransition = () => {
  return <Header />;
};

export default HeaderTransition;
