const PageTitle = ({ children }: { children: string }) => (
  <h1 className="text-3xl font-extrabold lowercase tracking-tight mb-10">
    <span className="gradient-purple-text">{children}</span>
  </h1>
);

export default PageTitle;