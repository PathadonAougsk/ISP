'use client'
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation"

export default function Sidebar() {
  const pathname = usePathname().replace("/", "");
  const icons = ["dashboard", "request-table", "report"]
  const router = useRouter();

  return (
    <div className="min-w-15 max-w-20 w-auto h-svh flex flex-col bg-[#73A9AD] sticky left-0 justify-between">
      <div className="flex flex-col w-full h-fit justify-evenly items-center">
        <div className="w-full h-15 flex justify-center items-center hover:bg-gray-500 select-none">
          <Image src={`./sidebar.svg`} width={20} height={20} alt={"Sidebar"} draggable={false}></Image>
        </div>
        {icons.map((urlName) =>
          pathname === urlName ? (
            <div key={urlName} className="w-full h-15 bg-[#90C8AC] flex justify-center items-center select-none">
              <Image src={`./${urlName}.svg`} width={20} height={20} alt={urlName} draggable={false}></Image>
            </div>
          ) : <div key={urlName} className="w-full h-15 flex justify-center items-center hover:bg-gray-500 select-none" onClick={() => router.replace(`/${urlName}`)}>
              <Image src={`./${urlName}.svg`} width={20} height={20} alt={urlName} draggable={false}></Image>
          </div>
        )}
        </div>
        <div className="flex flex-col w-full h-fit justify-evenly items-center select-none">
          <div className="w-full h-15 flex justify-center items-center">
            <Image src={`./announcement.svg`} width={20} height={20} alt={"Announcement"} draggable={false}></Image>
          </div>
          <div className="w-full h-15 flex justify-center items-center">
            <Image src={`./setting.svg`} width={20} height={20} alt={"Setting"} draggable={false}></Image>
          </div>
        </div>
    </div>
  )
}
