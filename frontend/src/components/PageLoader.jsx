import { LoaderIcon } from "lucide-react"

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
        <LoaderIcon className="animate-spin" size={40} color="#4f46e5" />
    </div>
  )
};

export default PageLoader;