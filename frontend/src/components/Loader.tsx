interface LoaderProps {
  message?: string;
}

export default function Loader({ message = "Gathering your pixels..." }: LoaderProps) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative">
        {/* Pure CSS Spinner */}
        <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-primary animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
           <svg className="h-8 w-8 text-primary animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
           </svg>
        </div>
      </div>
      <p className="mt-8 text-xl font-bold tracking-tight text-foreground animate-pulse">
        {message}
      </p>
      <div className="mt-2 h-1 w-48 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary animate-progress-loading"></div>
      </div>
    </div>
  );
}
