import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  return (
    <div>
      <div className="flex flex-row items-center justify-end gap-2 px-2 py-1">
        <ModeToggle />
        <UserMenu />
      </div>
      <hr />
    </div>
  );
}
