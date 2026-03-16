import {
    PiHardDrivesDuotone,
    PiRocketLaunchDuotone,
    PiDatabaseDuotone,
    PiShieldCheckDuotone,
    PiGitBranchDuotone,
    PiGearSixDuotone,
} from 'react-icons/pi'
import type { JSX } from 'react'

export type NavigationIcons = Record<string, JSX.Element>

const navigationIcon: NavigationIcons = {
    instances: <PiHardDrivesDuotone />,
    deploy: <PiRocketLaunchDuotone />,
    backups: <PiDatabaseDuotone />,
    ssl: <PiShieldCheckDuotone />,
    git: <PiGitBranchDuotone />,
    setup: <PiGearSixDuotone />,
}

export default navigationIcon
