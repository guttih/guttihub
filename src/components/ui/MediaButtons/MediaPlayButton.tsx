import { MediaControlButtonBase } from "./MediaControlButtonBase";

export function MediaPlayButton(props: React.ComponentProps<typeof MediaControlButtonBase>) {
  return (
    <MediaControlButtonBase
      title="Play"
      bgColor="bg-white/10 hover:bg-green-600 ring-white/20  hover:bg-green-700 "
      ringColor="ring-green-300"
      {...props}
    >
       <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-6 h-6"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                                />
                            </svg>
    </MediaControlButtonBase>
  );
}
