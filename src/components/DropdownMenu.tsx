import { Menu, Transition } from '@headlessui/react'
import React, { Fragment } from 'react'
import { IoLogoGithub, IoMenu } from 'react-icons/io5'
import DropdownMenuItem from './DropdownMenuItem'

interface Props {
  categories: string[]
}

export default function DropdownMenu({ categories }: Props) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button
          className="inline-flex justify-center rounded-md border border-zinc-400 dark:border-zinc-700 px-2 py-2 text-sm font-medium shadow-sm hover:bg-orange-200 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-100 transition-all"
          aria-label="menu"
        >
          <IoMenu className="h-5 w-5" />
        </Menu.Button>
      </div>
      <Transition
        as={Fragment}
        enter="transtion ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md border border-zinc-400 dark:border-zinc-700 bg-orange-50 dark:bg-zinc-800 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none divide-zinc-400 dark:divide-zinc-700">
          <div className="md:hidden">
            <DropdownMenuItem href="/">Home</DropdownMenuItem>
            <DropdownMenuItem href="/blog">Blog</DropdownMenuItem>
            <DropdownMenuItem href="/about">About</DropdownMenuItem>
            <DropdownMenuItem href="https://github.com/theweak1">
              <IoLogoGithub className="inline-block mr-2" />
              GitHub
            </DropdownMenuItem>
            <div className="py1  border border-zinc-300">
              <div className="px-3 py-2 uppercase font-bold text-xs">
                Categories
              </div>
              {categories.map(category => {
                return (
                  <DropdownMenuItem
                    key={category}
                    href={`/categories/${category.toLowerCase()}`}
                  >
                    {category}
                  </DropdownMenuItem>
                )
              })}
            </div>
          </div>
          <div className="py1 hidden md:block border border-zinc-300">
            <div className="px-3 py-2 uppercase font-bold text-xs">
              Categories
            </div>
            {categories.map(category => {
              return (
                <DropdownMenuItem
                  key={category}
                  href={`/categories/${category.toLowerCase()}`}
                >
                  {category}
                </DropdownMenuItem>
              )
            })}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}
