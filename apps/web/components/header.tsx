interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="flex h-16 items-center border-b border-white/10 bg-[#242836] px-6">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
    </header>
  );
}
