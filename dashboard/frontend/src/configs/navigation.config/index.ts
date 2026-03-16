import {
    NAV_ITEM_TYPE_ITEM,
    NAV_ITEM_TYPE_TITLE,
} from '@/constants/navigation.constant'
import type { NavigationTree } from '@/@types/navigation'

const navigationConfig: NavigationTree[] = [
    {
        key: 'management',
        path: '',
        title: 'Management',
        translateKey: 'nav.management',
        icon: '',
        type: NAV_ITEM_TYPE_TITLE,
        authority: [],
        subMenu: [
            {
                key: 'instances',
                path: '/instances',
                title: 'Instances',
                translateKey: 'nav.instances',
                icon: 'instances',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [],
                subMenu: [],
            },
            {
                key: 'deploy',
                path: '/deploy',
                title: 'Deploy',
                translateKey: 'nav.deploy',
                icon: 'deploy',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [],
                subMenu: [],
            },
            {
                key: 'backups',
                path: '/backups',
                title: 'Backups',
                translateKey: 'nav.backups',
                icon: 'backups',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [],
                subMenu: [],
            },
        ],
    },
    {
        key: 'infrastructure',
        path: '',
        title: 'Infrastructure',
        translateKey: 'nav.infrastructure',
        icon: '',
        type: NAV_ITEM_TYPE_TITLE,
        authority: [],
        subMenu: [
            {
                key: 'ssl',
                path: '/ssl',
                title: 'SSL',
                translateKey: 'nav.ssl',
                icon: 'ssl',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [],
                subMenu: [],
            },
            {
                key: 'git',
                path: '/git',
                title: 'Git',
                translateKey: 'nav.git',
                icon: 'git',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [],
                subMenu: [],
            },
            {
                key: 'setup',
                path: '/setup',
                title: 'Setup',
                translateKey: 'nav.setup',
                icon: 'setup',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [],
                subMenu: [],
            },
        ],
    },
]

export default navigationConfig
