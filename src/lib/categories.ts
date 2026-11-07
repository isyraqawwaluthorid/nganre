import type { CategoryId } from './types'

type Category = {
  label: string
  emoji: string
  color: string
  description: string
}

export const CATEGORIES: Record<CategoryId, Category> = {
  coto: {
    label: 'Coto',
    emoji: '🍲',
    color: '#c2410c',
    description: 'Sup daging dan jeroan sapi berkuah kacang sangrai, disantap dengan ketupat atau burasa.',
  },
  konro: {
    label: 'Konro',
    emoji: '🍖',
    color: '#7c2d12',
    description: 'Iga sapi berkuah kluwek yang hitam pekat, atau dibakar dengan bumbu kacang.',
  },
  pallubasa: {
    label: 'Pallubasa',
    emoji: '🥣',
    color: '#b45309',
    description: 'Mirip coto, tapi kuahnya memakai kelapa sangrai dan sering ditambah kuning telur mentah.',
  },
  'sop-saudara': {
    label: 'Sop Saudara',
    emoji: '🥘',
    color: '#a21caf',
    description: 'Sop daging dan paru sapi dengan bihun dan perkedel, aslinya dari Pangkep.',
  },
  mie: {
    label: 'Mie',
    emoji: '🍜',
    color: '#a16207',
    description: 'Mie titi yang renyah dengan kuah kental, mie awa, dan pangsit mie ala Makassar.',
  },
  seafood: {
    label: 'Seafood',
    emoji: '🐟',
    color: '#0369a1',
    description: 'Ikan bakar, kepiting, dan hasil laut segar dari Selat Makassar.',
  },
  jajanan: {
    label: 'Jajanan',
    emoji: '🍌',
    color: '#15803d',
    description: 'Pisang ijo, pisang epe, jalangkote, dan otak-otak.',
  },
  'khas-daerah': {
    label: 'Khas Daerah',
    emoji: '🥢',
    color: '#be123c',
    description: 'Kapurung, sagu berkuah asam dari Luwu, dan nasu palekko, bebek pedas khas Bugis.',
  },
  warkop: {
    label: 'Warkop',
    emoji: '☕',
    color: '#57534e',
    description: 'Budaya ngopi Makassar: kopi susu dan roti bakar srikaya sambil ngobrol lama.',
  },
}

export const CATEGORY_ORDER = Object.keys(CATEGORIES) as CategoryId[]
