import { MediaControlButtonBase } from "./MediaControlButtonBase";

export function MediaDownloadButton(props: React.ComponentProps<typeof MediaControlButtonBase>) {
  return (
    <MediaControlButtonBase
      title="Download"
      bgColor="bg-purple-600 bg-white/10 shadow-md ring-1 ring-white/20 hover:bg-purple-700"
      ringColor="ring-purple-300"
      {...props}
    >
      💾
    </MediaControlButtonBase>
  );
}
