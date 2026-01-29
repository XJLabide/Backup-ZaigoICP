interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="flex h-16 items-center border-b border-neutral-200 bg-white px-6">
      <h2 className="text-lg font-semibold text-black">{title}</h2>
    </header>
  );
}
