import { MediaControlButtonBase } from "./MediaControlButtonBase";

export function MediaStreamButton(props: React.ComponentProps<typeof MediaControlButtonBase>) {
  return (
    <MediaControlButtonBase
      title="Start Live Stream"
    bgColor="bg-sky-900 hover:bg-sky-700"
      ringColor="ring-gray-700"
      {...props}
    >
      📡
    </MediaControlButtonBase>
  );
}
