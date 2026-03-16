'use client'

import Avatar from '@/components/ui/Avatar'
import Dropdown from '@/components/ui/Dropdown'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import { useRouter } from 'next/navigation'
import { PiUserDuotone, PiSignOutDuotone } from 'react-icons/pi'
import axios from 'axios'

import type { JSX } from 'react'

const apiPrefix = process.env.NODE_ENV === 'development' ? 'http://localhost:3000/api' : '/api'

type DropdownList = {
    label: string
    path: string
    icon: JSX.Element
}

const dropdownItemList: DropdownList[] = []

const _UserDropdown = () => {
    const router = useRouter()

    const handleSignOut = async () => {
        try {
            await axios.post(`${apiPrefix}/auth/logout`, {}, { withCredentials: true })
        } catch {
            // ignore
        }
        router.push('/sign-in')
    }

    const avatarProps = {
        icon: <PiUserDuotone />,
    }

    return (
        <Dropdown
            className="flex"
            toggleClassName="flex items-center"
            renderTitle={
                <div className="cursor-pointer flex items-center">
                    <Avatar size={32} {...avatarProps} />
                </div>
            }
            placement="bottom-end"
        >
            <Dropdown.Item variant="header">
                <div className="py-2 px-3 flex items-center gap-3">
                    <Avatar {...avatarProps} />
                    <div>
                        <div className="font-bold text-gray-900 dark:text-gray-100">
                            Admin
                        </div>
                        <div className="text-xs">
                            Odoo Manager
                        </div>
                    </div>
                </div>
            </Dropdown.Item>
            <Dropdown.Item variant="divider" />
            <Dropdown.Item
                eventKey="Sign Out"
                className="gap-2"
                onClick={handleSignOut}
            >
                <span className="text-xl">
                    <PiSignOutDuotone />
                </span>
                <span>Sign Out</span>
            </Dropdown.Item>
        </Dropdown>
    )
}

const UserDropdown = withHeaderItem(_UserDropdown)

export default UserDropdown
