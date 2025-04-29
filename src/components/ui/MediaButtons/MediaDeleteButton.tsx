import { MediaControlButtonBase } from "./MediaControlButtonBase";

export function MediaDeleteButton(props: React.ComponentProps<typeof MediaControlButtonBase>) {
  return (
    <MediaControlButtonBase
      title="Delete"
      bgColor="bg-red-800 hover:bg-red-700"
      ringColor="ring-red-400"
      {...props}
    >
      🗑️
    </MediaControlButtonBase>
  );
}
