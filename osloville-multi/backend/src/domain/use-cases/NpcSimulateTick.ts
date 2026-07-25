import { IPlayerRepository } from '../repositories/IPlayerRepository';
import { Player } from '../entities/Player';

const NPC_DEFS = [
  { id: 'npc_1', name: 'Ingrid Ø.', avatarUrl: 'https://i.pravatar.cc/100?img=11', color: '#FF8FA3', status: 'Kaffe at Tim Wendelboe? ☕' },
  { id: 'npc_2', name: 'Magnus L.', avatarUrl: 'https://i.pravatar.cc/100?img=12', color: '#7DD8C6', status: 'Coding near Aker Brygge 💻' },
  { id: 'npc_3', name: 'Sofia K.', avatarUrl: 'https://i.pravatar.cc/100?img=13', color: '#A78BFA', status: 'Vigeland walk 🌿' },
  { id: 'npc_4', name: 'Jonas P.', avatarUrl: 'https://i.pravatar.cc/100?img=14', color: '#FBBF24', status: 'Ski waxing ⛷️' },
  { id: 'npc_5', name: 'Amara D.', avatarUrl: 'https://i.pravatar.cc/100?img=15', color: '#60A5FA', status: 'Hei Oslo! 👋' },
  { id: 'npc_6', name: 'Elias R.', avatarUrl: 'https://i.pravatar.cc/100?img=16', color: '#34D399', status: 'Sunset at Opera 🌅' },
  { id: 'npc_7', name: 'Henrik T.', avatarUrl: 'https://i.pravatar.cc/100?img=17', color: '#FDE68A', status: 'Fjord sauna! 🧖‍♂️❄️' },
  { id: 'npc_8', name: 'Maja I.', avatarUrl: 'https://i.pravatar.cc/100?img=18', color: '#F9A8D4', status: 'Flea market today 🧶' },
];

export class NpcSimulateTick {
  constructor(private playerRepo: IPlayerRepository) {}

  async initializeNpcs(): Promise<void> {
    for (const def of NPC_DEFS) {
      const existing = await this.playerRepo.findById(def.id);
      if (!existing) {
        const npc: Player = {
          id: def.id,
          email: null,
          name: def.name,
          avatarUrl: def.avatarUrl,
          x: 200 + Math.random() * 2000,
          y: 200 + Math.random() * 1400,
          lat: 59.9139,
          lng: 10.7522,
          status: def.status,
          hat: '',
          acc: '',
          color: def.color,
          coins: 1200,
          xp: 580,
          level: 5,
          walkKm: 1.0,
          discovered: ['palace', 'karljohan'],
          updatedAt: new Date(),
        };
        await this.playerRepo.save(npc);
        await this.playerRepo.updateInventory(def.id, { hat_beanie: 1 });
      }
    }
  }

  async execute(): Promise<Player[]> {
    const updatedNpcs: Player[] = [];
    const npcStatuses = [
      'Kaffe at Grünerløkka? ☕',
      'Walking in Vigeland Park 🌳',
      'Strolling Karl Johan Gate 🛍️',
      'Enjoying Oslofjord views ⛵',
      'Sauna then fjord dip! 🧖‍♂️❄️',
      'Climbing Holmenkollen ⛷️',
      'Eating golden boller 🥐',
      'Coding new game features 💻',
      'Shopping near Sentrum 🎒',
    ];

    for (const def of NPC_DEFS) {
      const npc = await this.playerRepo.findById(def.id);
      if (npc) {
        // 50% chance to drift coordinates
        if (Math.random() < 0.5) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 60 + Math.random() * 180;
          npc.x = Math.max(100, Math.min(2300, npc.x + Math.cos(angle) * dist));
          npc.y = Math.max(100, Math.min(1700, npc.y + Math.sin(angle) * dist));
          
          // Recompute Lat/Lng
          npc.lng = 10.62 + (npc.x / 2400) * 0.20;
          npc.lat = 59.97 - (npc.y / 1800) * 0.08;
          npc.walkKm += dist * 0.001;
        }

        // 15% chance to update status bubble
        if (Math.random() < 0.15) {
          npc.status = npcStatuses[Math.floor(Math.random() * npcStatuses.length)];
        }

        npc.updatedAt = new Date();
        const saved = await this.playerRepo.save(npc);
        updatedNpcs.push(saved);
      }
    }

    return updatedNpcs;
  }
}
export { NPC_DEFS };
