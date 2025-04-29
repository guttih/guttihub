import { MediaControlButtonBase } from "./MediaControlButtonBase";

export function MediaRecordButton(props: React.ComponentProps<typeof MediaControlButtonBase>) {
    return (
        <MediaControlButtonBase 
            title="Record" 
            bgColor="bg-rose-900/90 hover:bg-rose-700" 
            ringColor="ring-gray-800" 
            {...props}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                <path
                    fillRule="evenodd"
                    d="M3 3.75A.75.75 0 0 1 3.75 3h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 3.75zM4.5 6h15a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-.75.75h-15a.75.75 0 0 1-.75-.75v-12A.75.75 0 0 1 4.5 6zM12 9.75a.75.75 0 0 1 .75.75v3.19l1.22-1.22a.75.75 0 1 1 1.06 1.06l-2.5 2.5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 0 1 1.06-1.06l1.22 1.22V10.5a.75.75 0 0 1 .75-.75z"
                    clipRule="evenodd"
                />
            </svg>
        </MediaControlButtonBase>
    );
}
