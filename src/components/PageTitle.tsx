const PageTitle = ({ children }: { children: string }) => (
  <h1 className="text-3xl font-extrabold lowercase text-foreground tracking-tight mb-10">
    {children}
  </h1>
);

export default PageTitle;