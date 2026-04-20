// Placeholder for Sakura Nova demo data
const seedData = {
  vtuber: {
    id: "sakura_nova",
    name: "SAKURA NOVA",
    subtitle: "一起創造下個舞台",
    bio: "這是 Sakura Nova 的個人簡介。",
    avatarUrl: "path/to/avatar.jpg",
    bannerUrl: "path/to/banner.jpg",
    socialLinks: {
      youtube: "https://youtube.com/sakuranova",
      twitter: "https://twitter.com/sakuranova",
      instagram: "https://instagram.com/sakuranova"
    },
    tags: ["Singer", "3D", "Idol"],
    themeColor: "#ec4899",
    createdAt: new Date()
  },
  milestones: [
    {
      id: "ms_3d_stage",
      vtuberId: "sakura_nova",
      title: "3D 舞台製作",
      description: "為 Sakura Nova 製作專屬 3D 舞台。",
      status: "active",
      targetAmount: 100000,
      currentAmount: 50000,
      totalSupporters: 100,
      badgeImageUrl: "path/to/badge.jpg",
      badgeTitle: "金星贊助者",
      isCollab: false,
      collaborators: [],
      createdAt: new Date()
    }
  ]
};

export default seedData;
