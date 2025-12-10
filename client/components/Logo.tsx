"use client"
import Image from "next/image"

type Props = {
  size?: number
}

export default function Logo({ size = 64 }: Props) {
  const px = size / 4
  return (
    <div
      className="relative rounded-2xl ml-2 md:ml-0 bg-white/70 shadow-xl shadow-purple-200/40"
      style={{ width: size, height: size, padding: px }}
    >
  <Image src="/logo.png" alt="DRID logo" fill sizes={`${size}px`} />
    </div>
  )
}