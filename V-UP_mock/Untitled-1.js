{
    "name": "ContributionBadge",
        "type": "object",
            "properties": {
        "milestone_id": {
            "type": "string",
                "description": "Reference to Milestone"
        },
        "vtuber_profile_id": {
            "type": "string",
                "description": "Reference to VTuberProfile"
        },
        "donor_email": {
            "type": "string",
                "description": "Email of the badge owner"
        },
        "donor_name": {
            "type": "string",
                "description": "Display name on badge"
        },
        "total_contributed": {
            "type": "number",
                "description": "Total amount this fan contributed to this milestone"
        },
        "badge_title": {
            "type": "string",
                "description": "Title of the badge"
        },
        "vtuber_name": {
            "type": "string",
                "description": "VTuber display name"
        },
        "milestone_title": {
            "type": "string",
                "description": "Milestone title for display"
        },
        "share_code": {
            "type": "string",
                "description": "Unique code for sharing"
        }
    },
    "required": [
        "milestone_id",
        "vtuber_profile_id",
        "donor_email"
    ]
}

{
    "name": "Donation",
        "type": "object",
            "properties": {
        "milestone_id": {
            "type": "string",
                "description": "Reference to Milestone"
        },
        "vtuber_profile_id": {
            "type": "string",
                "description": "Reference to VTuberProfile"
        },
        "donor_name": {
            "type": "string",
                "description": "Display name of donor"
        },
        "donor_email": {
            "type": "string",
                "description": "Email of donor"
        },
        "amount": {
            "type": "number",
                "description": "Donation amount in TWD"
        },
        "message": {
            "type": "string",
                "description": "Optional message with donation"
        },
        "is_anonymous": {
            "type": "boolean",
                "default": false
        }
    },
    "required": [
        "milestone_id",
        "vtuber_profile_id",
        "amount"
    ]
}

{
    "name": "Milestone",
        "type": "object",
            "properties": {
        "vtuber_profile_id": {
            "type": "string",
                "description": "Reference to VTuberProfile"
        },
        "title": {
            "type": "string",
                "description": "Milestone title"
        },
        "description": {
            "type": "string",
                "description": "What this milestone is for"
        },
        "icon": {
            "type": "string",
                "description": "Emoji or icon for the milestone"
        },
        "target_amount": {
            "type": "number",
                "description": "Goal amount in TWD"
        },
        "current_amount": {
            "type": "number",
                "default": 0,
                    "description": "Currently raised amount"
        },
        "status": {
            "type": "string",
                "enum": [
                    "active",
                    "completed",
                    "upcoming"
                ],
                    "default": "upcoming",
                        "description": "Milestone status"


            {
                "name": "MilestonePost",
                    "type": "object",
                        "properties": {
                    "milestone_id": {
                        "type": "string",
                            "description": "Reference to Milestone"
                    },
                    "vtuber_profile_id": {
                        "type": "string",
                            "description": "Reference to VTuberProfile"
                    },
                    "content": {
                        "type": "string",
                            "description": "Post content"
                    },
                    "image_url": {
                        "type": "string",
                            "description": "Optional image"
                    }
                },
                "required": [
                    "milestone_id",
                    "vtuber_profile_id",
                    "content"
                ]
            }

            {
                "name": "VTuberProfile",
                    "type": "object",
                        "properties": {
                    "display_name": {
                        "type": "string",
                            "description": "VTuber display name"
                    },
                    "slug": {
                        "type": "string",
                            "description": "URL-friendly unique identifier"
                    },
                    "avatar_url": {
                        "type": "string",
                            "description": "Profile avatar image URL"
                    },
                    "banner_url": {
                        "type": "string",
                            "description": "Profile banner image URL"
                    },
                    "bio": {
                        "type": "string",
                            "description": "Short bio/description"
                    },
                    "template": {
                        "type": "string",
                            "enum": [
                                "sakura",
                                "galaxy",
                                "ocean",
                                "ember"
                            ],
                                "default": "sakura",
                                    "description": "Page template theme"
                    },
                    "social_links": {
                        "type": "array",
                            "description": "Social media links",
                                "items": {
                            "type": "object",
                                "properties": {
                                "platform": {
                                    "type": "string"
                                },
                                "url": {
                                    "type": "string"
                                }
                            }
                        }
                    },
                    "theme_color": {
                        "type": "string",
                            "description": "Custom accent color hex code",
                                "default": "#8B5CF6"
                    },
                    "total_raised": {
                        "type": "number",
                            "default": 0
                    },
                    "supporter_count": {
                        "type": "number",
                            "default": 0
                    }
                },
                "required": [
                    "display_name",
                    "slug"
                ]
            }

            import { createClient } from '@base44/sdk';
            import { appParams } from '@/lib/app-params';

            const { appId, token, functionsVersion, appBaseUrl } = appParams;

            //Create a client with authentication required
            export const base44 = createClient({
                appId,
                token,
                functionsVersion,
                serverUrl: '',
                requiresAuth: false,
                appBaseUrl
            });


            import React from 'react';
            import { Card, CardContent } from '@/components/ui/card';
            import { Button } from '@/components/ui/button';
            import { Progress } from '@/components/ui/progress';
            import { Badge } from '@/components/ui/badge';
            import { Pencil, CheckCircle2 } from 'lucide-react';
            import { base44 } from '@/api/base44Client';
            import { useMutation, useQueryClient } from '@tanstack/react-query';
            import { toast } from 'sonner';

            export default function MilestoneCard({ milestone, isActive, isCompleted, onEdit }) {
                const queryClient = useQueryClient();
                const progress = milestone.target_amount > 0 ? Math.min((milestone.current_amount / milestone.target_amount) * 100, 100) : 0;

                const completeMutation = useMutation({
                    mutationFn: () => base44.entities.Milestone.update(milestone.id, { status: 'completed', completed_at: new Date().toISOString() }),
                    onSuccess: () => {
                        queryClient.invalidateQueries({ queryKey: ['my-milestones'] });
                        toast.success('里程碑已完成！');
                    },
                });

                const activateMutation = useMutation({
                    mutationFn: () => base44.entities.Milestone.update(milestone.id, { status: 'active' }),
                    onSuccess: () => {
                        queryClient.invalidateQueries({ queryKey: ['my-milestones'] });
                        toast.success('已啟動里程碑！');
                    },
                });

                return (
                    <Card className={`transition-all ${isActive ? 'border-primary/50 shadow-lg shadow-primary/5' : ''} ${isCompleted ? 'opacity-80' : ''}`}>
                        <CardContent className="pt-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <span className="text-3xl">{milestone.icon || '🌟'}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-lg">{milestone.title}</h3>
                                            {isActive && <Badge className="bg-primary/10 text-primary border-primary/20">進行中</Badge>}
                                            {isCompleted && <Badge className="bg-green-100 text-green-700 border-green-200">已完成</Badge>}
                                            {milestone.status === 'upcoming' && <Badge variant="secondary">即將到來</Badge>}
                                        </div>
                                        {milestone.description && <p className="text-sm text-muted-foreground mt-1">{milestone.description}</p>}

                                        {(isActive || isCompleted) && (
                                            <div className="mt-4">
                                                <div className="flex items-center justify-between text-sm mb-2">
                                                    <span className="text-muted-foreground">NT$ {(milestone.current_amount || 0).toLocaleString()}</span>
                                                    <span className="font-medium">NT$ {milestone.target_amount?.toLocaleString()}</span>
                                                </div>
                                                <Progress value={progress} className="h-3" />
                                                <p className="text-xs text-muted-foreground mt-1">{Math.round(progress)}% 完成</p>
                                            </div>
                                        )}

                                        {milestone.status === 'upcoming' && (
                                            <p className="text-sm text-muted-foreground mt-2">目標：NT$ {milestone.target_amount?.toLocaleString()}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    {onEdit && (
                                        <Button variant="ghost" size="icon" onClick={() => onEdit(milestone)}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                    )}
                                    {isActive && progress >= 100 && (
                                        <Button size="sm" onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
                                            <CheckCircle2 className="w-4 h-4 mr-1" /> 完成
                                        </Button>
                                    )}
                                    {milestone.status === 'upcoming' && !isActive && (
                                        <Button variant="outline" size="sm" onClick={() => activateMutation.mutate()} disabled={activateMutation.isPending}>
                                            啟動
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            }



            import React, { useState } from 'react';
            import { base44 } from '@/api/base44Client';
            import { useMutation, useQueryClient } from '@tanstack/react-query';
            import { Button } from '@/components/ui/button';
            import { Input } from '@/components/ui/input';
            import { Textarea } from '@/components/ui/textarea';
            import { Label } from '@/components/ui/label';
            import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
            import { toast } from 'sonner';

            const ICONS = ['🎤', '🎮', '💻', '🎨', '🎵', '📸', '🎬', '🏆', '🎊', '🌟', '🚀', '💎'];

            export default function MilestoneForm({ profileId, milestone, hasActive, onDone }) {
                const queryClient = useQueryClient();
                const isEdit = !!milestone;

                const [form, setForm] = useState({
                    title: milestone?.title || '',
                    description: milestone?.description || '',
                    icon: milestone?.icon || '🌟',
                    target_amount: milestone?.target_amount || '',
                    thank_you_message: milestone?.thank_you_message || '',
                    badge_title: milestone?.badge_title || '',
                    status: milestone?.status || (hasActive ? 'upcoming' : 'active'),
                });

                const mutation = useMutation({
                    mutationFn: (data) => {
                        if (isEdit) {
                            return base44.entities.Milestone.update(milestone.id, data);
                        }
                        return base44.entities.Milestone.create({ ...data, vtuber_profile_id: profileId });
                    },
                    onSuccess: () => {
                        queryClient.invalidateQueries({ queryKey: ['my-milestones'] });
                        toast.success(isEdit ? '已更新里程碑！' : '已新增里程碑！');
                        onDone();
                    },
                });

                const handleSubmit = (e) => {
                    e.preventDefault();
                    mutation.mutate({
                        ...form,
                        target_amount: Number(form.target_amount),
                    });
                };

                return (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label>里程碑圖示</Label>
                            <div className="flex gap-2 flex-wrap mt-1">
                                {ICONS.map(icon => (
                                    <button
                                        key={icon}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, icon }))}
                                        className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center border-2 transition-all ${form.icon === icon ? 'border-primary bg-primary/10 scale-110' : 'border-border hover:border-primary/30'}`}
                                    >
                                        {icon}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <Label>里程碑名稱 *</Label>
                            <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="例：升級直播設備" required />
                        </div>
                        <div>
                            <Label>描述</Label>
                            <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="詳細說明這個里程碑的目的..." rows={3} />
                        </div>
                        <div>
                            <Label>目標金額 (NT$) *</Label>
                            <Input type="number" min={1} value={form.target_amount} onChange={(e) => setForm(f => ({ ...f, target_amount: e.target.value }))} placeholder="10000" required />
                        </div>
                        <div>
                            <Label>徽章標題</Label>
                            <Input value={form.badge_title} onChange={(e) => setForm(f => ({ ...f, badge_title: e.target.value }))} placeholder="例：設備升級推手" />
                            <p className="text-xs text-muted-foreground mt-1">貢獻者獲得的永久徽章名稱</p>
                        </div>



                        import React, {useState} from 'react';
                        import {base44} from '@/api/base44Client';
                        import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
                        import {Button} from '@/components/ui/button';
                        import {Textarea} from '@/components/ui/textarea';
                        import {Input} from '@/components/ui/input';
                        import {Label} from '@/components/ui/label';
                        import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
                        import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
                        import {toast} from 'sonner';
                        import {Plus, Trash2} from 'lucide-react';

                        export default function MilestonePostManager({profileId, milestones}) {
  const queryClient = useQueryClient();
                        const [selectedMilestone, setSelectedMilestone] = useState('');
                        const [content, setContent] = useState('');

                        const {data: posts = [] } = useQuery({
                            queryKey: ['milestone-posts', profileId],
    queryFn: () => base44.entities.MilestonePost.filter({vtuber_profile_id: profileId }, '-created_date'),
                        enabled: !!profileId,
  });

                        const createMutation = useMutation({
                            mutationFn: (data) => base44.entities.MilestonePost.create(data),
    onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: ['milestone-posts'] });
                        setContent('');
                        toast.success('貼文已發布！');
    },
  });

                        const deleteMutation = useMutation({
                            mutationFn: (id) => base44.entities.MilestonePost.delete(id),
    onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: ['milestone-posts'] });
                        toast.success('已刪除');
    },
  });

  const handlePost = () => {
    if (!selectedMilestone || !content.trim()) return;
                        createMutation.mutate({
                            milestone_id: selectedMilestone,
                        vtuber_profile_id: profileId,
                        content: content.trim(),
    });
  };

  const getMilestoneName = (id) => milestones.find(m => m.id === id)?.title || '未知';

                        return (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>發布限定貼文</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label>選擇里程碑</Label>
                                        <Select value={selectedMilestone} onValueChange={setSelectedMilestone}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="選擇里程碑..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {milestones.map(m => (
                                                    <SelectItem key={m.id} value={m.id}>{m.icon} {m.title}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>貼文內容</Label>
                                        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="寫下你想對貢獻者說的話..." rows={4} />
                                    </div>
                                    <Button onClick={handlePost} disabled={!selectedMilestone || !content.trim() || createMutation.isPending}>
                                        <Plus className="w-4 h-4 mr-1" /> 發布
                                    </Button>
                                </CardContent>
                            </Card>

                            {posts.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>已發布的貼文</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {posts.map(post => (
                                            <div key={post.id} className="flex items-start justify-between gap-3 p-4 rounded-lg bg-secondary/50 border">
                                                <div className="flex-1">
                                                    <p className="text-xs text-muted-foreground mb-1">{getMilestoneName(post.milestone_id)} · {new Date(post.created_date).toLocaleDateString('zh-TW')}</p>
                                                    <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                                                </div>
                                                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(post.id)}>
                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                </Button>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                        );
}


                        import React, {useState} from 'react';
                        import {base44} from '@/api/base44Client';
                        import {useMutation, useQueryClient} from '@tanstack/react-query';
                        import {Button} from '@/components/ui/button';
                        import {Input} from '@/components/ui/input';
                        import {Textarea} from '@/components/ui/textarea';
                        import {Label} from '@/components/ui/label';
                        import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
                        import {toast} from 'sonner';
                        import {Sparkles} from 'lucide-react';
                        import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';

                        const TEMPLATES = [
                        {key: 'sakura', label: '🌸 粉櫻少女', desc: '粉嫩玫瑰色系，適合可愛系 VTuber' },
                        {key: 'galaxy', label: '⭐ 星辰少年', desc: '夢幻紫色星空，神秘或王道風格' },
                        {key: 'ocean', label: '🌊 深海公主', desc: '清涼水藍色系，清新治癒系' },
                        {key: 'ember', label: '🔥 烈焰勇者', desc: '熱情橙紅色系，活力或遊戲實況型' },
                        ];

                        export default function ProfileForm({user, existingProfile, isNew}) {
  const queryClient = useQueryClient();
                        const [form, setForm] = useState({
                            display_name: existingProfile?.display_name || '',
                        slug: existingProfile?.slug || '',
                        bio: existingProfile?.bio || '',
                        avatar_url: existingProfile?.avatar_url || '',
                        banner_url: existingProfile?.banner_url || '',
                        theme_color: existingProfile?.theme_color || '#8B5CF6',
                        template: existingProfile?.template || 'sakura',
  });

                        const mutation = useMutation({
                            mutationFn: (data) => {
      if (existingProfile) {
        return base44.entities.VTuberProfile.update(existingProfile.id, data);
      }
                        return base44.entities.VTuberProfile.create(data);
    },
    onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: ['my-profile'] });
                        toast.success(existingProfile ? '已更新！' : '建立成功！');
    },
  });

  const handleSubmit = (e) => {
                            e.preventDefault();
                        const slug = form.slug || form.display_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
                        mutation.mutate({...form, slug});
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
                        if (!file) return;
                        const {file_url} = await base44.integrations.Core.UploadFile({file});
    setForm(f => ({...f, avatar_url: file_url }));
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
                        if (!file) return;
                        const {file_url} = await base44.integrations.Core.UploadFile({file});
    setForm(f => ({...f, banner_url: file_url }));
  };

                        return (
                        <div className={isNew ? 'min-h-screen flex items-center justify-center p-6' : ''}>
                            <Card className={isNew ? 'max-w-lg w-full' : ''}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        {isNew && <Sparkles className="w-5 h-5 text-primary" />}
                                        {isNew ? '建立你的 VTuber 頁面' : '個人資料設定'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <Label>顯示名稱 *</Label>
                                            <Input value={form.display_name} onChange={(e) => setForm(f => ({ ...f, display_name: e.target.value }))} placeholder="你的 VTuber 名稱" required />
                                        </div>
                                        <div>
                                            <Label>網址代稱</Label>
                                            <Input value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} placeholder="my-name（留空自動產生）" />
                                            <p className="text-xs text-muted-foreground mt-1">公開頁面網址：/vtuber/{form.slug || '...'}</p>
                                        </div>
                                        <div>
                                            <div>
                                                <Label>頁面風格模板</Label>
                                                <div className="grid grid-cols-2 gap-2 mt-1.5">
                                                    {TEMPLATES.map(t => (
                                                        <button
                                                            key={t.key}
                                                            type="button"
                                                            onClick={() => setForm(f => ({ ...f, template: t.key }))}
                                                            className={`p-3 rounded-xl border-2 text-left transition-all ${form.template === t.key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                                                        >
                                                            <div className="font-bold text-sm">{t.label}</div>
                                                            <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <Label>自我介紹</Label>
                                            <Textarea value={form.bio} onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="簡短介紹自己..." rows={3} />
                                        </div>
                                        <div>
                                            <Label>大頭貼</Label>
                                            <Input type="file" accept="image/*" onChange={handleAvatarUpload} />
                                            {form.avatar_url && <img src={form.avatar_url} alt="avatar" className="w-16 h-16 rounded-full mt-2 object-cover" />}
                                        </div>
                                        <div>
                                            <Label>橫幅圖片</Label>
                                            <Input type="file" accept="image/*" onChange={handleBannerUpload} />
                                            {form.banner_url && <img src={form.banner_url} alt="banner" className="w-full h-20 rounded-lg mt-2 object-cover" />}
                                        </div>
                                        <Button type="submit" className="w-full" disabled={mutation.isPending}>
                                            {mutation.isPending ? '儲存中...' : (isNew ? '開始使用' : '儲存')}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                        );
}
                        import React from 'react';
                        import {Card, CardContent} from '@/components/ui/card';
                        import {Button} from '@/components/ui/button';
                        import {Progress} from '@/components/ui/progress';
                        import {Badge} from '@/components/ui/badge';
                        import {Pencil, CheckCircle2} from 'lucide-react';
                        import {base44} from '@/api/base44Client';
                        import {useMutation, useQueryClient} from '@tanstack/react-query';
                        import {toast} from 'sonner';

                        export default function MilestoneCard({milestone, isActive, isCompleted, onEdit}) {
  const queryClient = useQueryClient();
  const progress = milestone.target_amount > 0 ? Math.min((milestone.current_amount / milestone.target_amount) * 100, 100) : 0;

                        const completeMutation = useMutation({
                            mutationFn: () => base44.entities.Milestone.update(milestone.id, {status: 'completed', completed_at: new Date().toISOString() }),
    onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: ['my-milestones'] });
                        toast.success('里程碑已完成！');
    },
  });

                        const activateMutation = useMutation({
                            mutationFn: () => base44.entities.Milestone.update(milestone.id, {status: 'active' }),
    onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: ['my-milestones'] });
                        toast.success('已啟動里程碑！');
    },
  });

                        return (
                        <Card className={`transition-all ${isActive ? 'border-primary/50 shadow-lg shadow-primary/5' : ''} ${isCompleted ? 'opacity-80' : ''}`}>
                            <CardContent className="pt-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <span className="text-3xl">{milestone.icon || '🌟'}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-bold text-lg">{milestone.title}</h3>
                                                {isActive && <Badge className="bg-primary/10 text-primary border-primary/20">進行中</Badge>}
                                                {isCompleted && <Badge className="bg-green-100 text-green-700 border-green-200">已完成</Badge>}
                                                {milestone.status === 'upcoming' && <Badge variant="secondary">即將到來</Badge>}
                                            </div>
                                            {milestone.description && <p className="text-sm text-muted-foreground mt-1">{milestone.description}</p>}

                                            {(isActive || isCompleted) && (
                                                <div className="mt-4">
                                                    <div className="flex items-center justify-between text-sm mb-2">
                                                        <span className="text-muted-foreground">NT$ {(milestone.current_amount || 0).toLocaleString()}</span>
                                                        <span className="font-medium">NT$ {milestone.target_amount?.toLocaleString()}</span>
                                                    </div>
                                                    <Progress value={progress} className="h-3" />
                                                    <p className="text-xs text-muted-foreground mt-1">{Math.round(progress)}% 完成</p>
                                                </div>
                                            )}

                                            {milestone.status === 'upcoming' && (
                                                <p className="text-sm text-muted-foreground mt-2">目標：NT$ {milestone.target_amount?.toLocaleString()}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        {onEdit && (
                                            <Button variant="ghost" size="icon" onClick={() => onEdit(milestone)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {isActive && progress >= 100 && (
                                            <Button size="sm" onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
                                                <CheckCircle2 className="w-4 h-4 mr-1" /> 完成
                                            </Button>
                                        )}
                                        {milestone.status === 'upcoming' && !isActive && (
                                            <Button variant="outline" size="sm" onClick={() => activateMutation.mutate()} disabled={activateMutation.isPending}>
                                                啟動
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        );
}
                        import React, {useState} from 'react';
                        import {base44} from '@/api/base44Client';
                        import {useMutation, useQueryClient} from '@tanstack/react-query';
                        import {Button} from '@/components/ui/button';
                        import {Input} from '@/components/ui/input';
                        import {Textarea} from '@/components/ui/textarea';
                        import {Label} from '@/components/ui/label';
                        import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
                        import {toast} from 'sonner';

                        const ICONS = ['🎤', '🎮', '💻', '🎨', '🎵', '📸', '🎬', '🏆', '🎊', '🌟', '🚀', '💎'];

                        export default function MilestoneForm({profileId, milestone, hasActive, onDone}) {
  const queryClient = useQueryClient();
                        const isEdit = !!milestone;

                        const [form, setForm] = useState({
                            title: milestone?.title || '',
                        description: milestone?.description || '',
                        icon: milestone?.icon || '🌟',
                        target_amount: milestone?.target_amount || '',
                        thank_you_message: milestone?.thank_you_message || '',
                        badge_title: milestone?.badge_title || '',
                        status: milestone?.status || (hasActive ? 'upcoming' : 'active'),
  });

                        const mutation = useMutation({
                            mutationFn: (data) => {
      if (isEdit) {
        return base44.entities.Milestone.update(milestone.id, data);
      }
                        return base44.entities.Milestone.create({...data, vtuber_profile_id: profileId });
    },
    onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: ['my-milestones'] });
                        toast.success(isEdit ? '已更新里程碑！' : '已新增里程碑！');
                        onDone();
    },
  });

  const handleSubmit = (e) => {
                            e.preventDefault();
                        mutation.mutate({
                            ...form,
                            target_amount: Number(form.target_amount),
    });
  };

                        return (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label>里程碑圖示</Label>
                                <div className="flex gap-2 flex-wrap mt-1">
                                    {ICONS.map(icon => (
                                        <button
                                            key={icon}
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, icon }))}
                                            className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center border-2 transition-all ${form.icon === icon ? 'border-primary bg-primary/10 scale-110' : 'border-border hover:border-primary/30'}`}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <Label>里程碑名稱 *</Label>
                                <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="例：升級直播設備" required />
                            </div>
                            <div>
                                <Label>描述</Label>
                                <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="詳細說明這個里程碑的目的..." rows={3} />
                            </div>
                            <div>
                                <Label>目標金額 (NT$) *</Label>
                                <Input type="number" min={1} value={form.target_amount} onChange={(e) => setForm(f => ({ ...f, target_amount: e.target.value }))} placeholder="10000" required />
                            </div>
                            <div>
                                <Label>徽章標題</Label>
                                <Input value={form.badge_title} onChange={(e) => setForm(f => ({ ...f, badge_title: e.target.value }))} placeholder="例：設備升級推手" />
                                <p className="text-xs text-muted-foreground mt-1">貢獻者獲得的永久徽章名稱</p>
                            </div>


                            import React, {useState} from 'react';
                            import {base44} from '@/api/base44Client';
                            import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
                            import {Button} from '@/components/ui/button';
                            import {Textarea} from '@/components/ui/textarea';
                            import {Input} from '@/components/ui/input';
                            import {Label} from '@/components/ui/label';
                            import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
                            import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
                            import {toast} from 'sonner';
                            import {Plus, Trash2} from 'lucide-react';

                            export default function MilestonePostManager({profileId, milestones}) {
  const queryClient = useQueryClient();
                            const [selectedMilestone, setSelectedMilestone] = useState('');
                            const [content, setContent] = useState('');

                            const {data: posts = [] } = useQuery({
                                queryKey: ['milestone-posts', profileId],
    queryFn: () => base44.entities.MilestonePost.filter({vtuber_profile_id: profileId }, '-created_date'),
                            enabled: !!profileId,
  });

                            const createMutation = useMutation({
                                mutationFn: (data) => base44.entities.MilestonePost.create(data),
    onSuccess: () => {
                                queryClient.invalidateQueries({ queryKey: ['milestone-posts'] });
                            setContent('');
                            toast.success('貼文已發布！');
    },
  });

                            const deleteMutation = useMutation({
                                mutationFn: (id) => base44.entities.MilestonePost.delete(id),
    onSuccess: () => {
                                queryClient.invalidateQueries({ queryKey: ['milestone-posts'] });
                            toast.success('已刪除');
    },
  });

  const handlePost = () => {
    if (!selectedMilestone || !content.trim()) return;
                            createMutation.mutate({
                                milestone_id: selectedMilestone,
                            vtuber_profile_id: profileId,
                            content: content.trim(),
    });
  };

  const getMilestoneName = (id) => milestones.find(m => m.id === id)?.title || '未知';

                            return (
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>發布限定貼文</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <Label>選擇里程碑</Label>
                                            <Select value={selectedMilestone} onValueChange={setSelectedMilestone}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="選擇里程碑..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {milestones.map(m => (
                                                        <SelectItem key={m.id} value={m.id}>{m.icon} {m.title}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>貼文內容</Label>
                                            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="寫下你想對貢獻者說的話..." rows={4} />
                                        </div>
                                        <Button onClick={handlePost} disabled={!selectedMilestone || !content.trim() || createMutation.isPending}>
                                            <Plus className="w-4 h-4 mr-1" /> 發布
                                        </Button>
                                    </CardContent>
                                </Card>

                                {posts.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>已發布的貼文</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {posts.map(post => (
                                                <div key={post.id} className="flex items-start justify-between gap-3 p-4 rounded-lg bg-secondary/50 border">
                                                    <div className="flex-1">
                                                        <p className="text-xs text-muted-foreground mb-1">{getMilestoneName(post.milestone_id)} · {new Date(post.created_date).toLocaleDateString('zh-TW')}</p>
                                                        <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                                                    </div>
                                                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(post.id)}>
                                                        <Trash2 className="w-4 h-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                            );
}

                            import React, {useState} from 'react';
                            import {base44} from '@/api/base44Client';
                            import {useMutation, useQueryClient} from '@tanstack/react-query';
                            import {Button} from '@/components/ui/button';
                            import {Input} from '@/components/ui/input';
                            import {Textarea} from '@/components/ui/textarea';
                            import {Label} from '@/components/ui/label';
                            import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
                            import {toast} from 'sonner';
                            import {Sparkles} from 'lucide-react';
                            import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';

                            const TEMPLATES = [
                            {key: 'sakura', label: '🌸 粉櫻少女', desc: '粉嫩玫瑰色系，適合可愛系 VTuber' },
                            {key: 'galaxy', label: '⭐ 星辰少年', desc: '夢幻紫色星空，神秘或王道風格' },
                            {key: 'ocean', label: '🌊 深海公主', desc: '清涼水藍色系，清新治癒系' },
                            {key: 'ember', label: '🔥 烈焰勇者', desc: '熱情橙紅色系，活力或遊戲實況型' },
                            ];

                            export default function ProfileForm({user, existingProfile, isNew}) {
  const queryClient = useQueryClient();
                            const [form, setForm] = useState({
                                display_name: existingProfile?.display_name || '',
                            slug: existingProfile?.slug || '',
                            bio: existingProfile?.bio || '',
                            avatar_url: existingProfile?.avatar_url || '',
                            banner_url: existingProfile?.banner_url || '',
                            theme_color: existingProfile?.theme_color || '#8B5CF6',
                            template: existingProfile?.template || 'sakura',
  });

                            const mutation = useMutation({
                                mutationFn: (data) => {
      if (existingProfile) {
        return base44.entities.VTuberProfile.update(existingProfile.id, data);
      }
                            return base44.entities.VTuberProfile.create(data);
    },
    onSuccess: () => {
                                queryClient.invalidateQueries({ queryKey: ['my-profile'] });
                            toast.success(existingProfile ? '已更新！' : '建立成功！');
    },
  });

  const handleSubmit = (e) => {
                                e.preventDefault();
                            const slug = form.slug || form.display_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
                            mutation.mutate({...form, slug});
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
                            if (!file) return;
                            const {file_url} = await base44.integrations.Core.UploadFile({file});
    setForm(f => ({...f, avatar_url: file_url }));
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
                            if (!file) return;
                            const {file_url} = await base44.integrations.Core.UploadFile({file});
    setForm(f => ({...f, banner_url: file_url }));
  };

                            return (
                            <div className={isNew ? 'min-h-screen flex items-center justify-center p-6' : ''}>
                                <Card className={isNew ? 'max-w-lg w-full' : ''}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            {isNew && <Sparkles className="w-5 h-5 text-primary" />}
                                            {isNew ? '建立你的 VTuber 頁面' : '個人資料設定'}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            <div>
                                                <Label>顯示名稱 *</Label>
                                                <Input value={form.display_name} onChange={(e) => setForm(f => ({ ...f, display_name: e.target.value }))} placeholder="你的 VTuber 名稱" required />
                                            </div>
                                            <div>
                                                <Label>網址代稱</Label>
                                                <Input value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} placeholder="my-name（留空自動產生）" />
                                                <p className="text-xs text-muted-foreground mt-1">公開頁面網址：/vtuber/{form.slug || '...'}</p>
                                            </div>
                                            <div>
                                                <div>
                                                    <Label>頁面風格模板</Label>
                                                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                                                        {TEMPLATES.map(t => (
                                                            <button
                                                                key={t.key}
                                                                type="button"
                                                                onClick={() => setForm(f => ({ ...f, template: t.key }))}
                                                                className={`p-3 rounded-xl border-2 text-left transition-all ${form.template === t.key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                                                            >
                                                                <div className="font-bold text-sm">{t.label}</div>
                                                                <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <Label>自我介紹</Label>
                                                <Textarea value={form.bio} onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="簡短介紹自己..." rows={3} />
                                            </div>
                                            <div>
                                                <Label>大頭貼</Label>
                                                <Input type="file" accept="image/*" onChange={handleAvatarUpload} />
                                                {form.avatar_url && <img src={form.avatar_url} alt="avatar" className="w-16 h-16 rounded-full mt-2 object-cover" />}
                                            </div>
                                            <div>
                                                <Label>橫幅圖片</Label>
                                                <Input type="file" accept="image/*" onChange={handleBannerUpload} />
                                                {form.banner_url && <img src={form.banner_url} alt="banner" className="w-full h-20 rounded-lg mt-2 object-cover" />}
                                            </div>
                                            <Button type="submit" className="w-full" disabled={mutation.isPending}>
                                                {mutation.isPending ? '儲存中...' : (isNew ? '開始使用' : '儲存')}
                                            </Button>
                                        </form>
                                    </CardContent>
                                </Card>
                            </div>
                            );
}

                            import * as React from "react"
                            import * as AccordionPrimitive from "@radix-ui/react-accordion"
                            import {ChevronDown} from "lucide-react"

                            import {cn} from "@/lib/utils"

                            const Accordion = AccordionPrimitive.Root

                            const AccordionItem = React.forwardRef(({className, ...props }, ref) => (
                            <AccordionPrimitive.Item ref={ref} className={cn("border-b", className)} {...props} />
                            ))
                            AccordionItem.displayName = "AccordionItem"

                            const AccordionTrigger = React.forwardRef(({className, children, ...props }, ref) => (
                            <AccordionPrimitive.Header className="flex">
                                <AccordionPrimitive.Trigger
                                    ref={ref}
                                    className={cn(
                                        "flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline text-left [&[data-state=open]>svg]:rotate-180",
                                        className
                                    )}
                                    {...props}>
                                    {children}
                                    <ChevronDown
                                        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                                </AccordionPrimitive.Trigger>
                            </AccordionPrimitive.Header>
                            ))
                            AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

                            const AccordionContent = React.forwardRef(({className, children, ...props }, ref) => (
                            <AccordionPrimitive.Content
                                ref={ref}
                                className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
                                {...props}>
                                <div className={cn("pb-4 pt-0", className)}>{children}</div>
                            </AccordionPrimitive.Content>
                            ))
                            AccordionContent.displayName = AccordionPrimitive.Content.displayName

                            export {Accordion, AccordionItem, AccordionTrigger, AccordionContent}
                            import * as React from "react"
                            import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

                            import {cn} from "@/lib/utils"
                            import {buttonVariants} from "@/components/ui/button"

                            const AlertDialog = AlertDialogPrimitive.Root

                            const AlertDialogTrigger = AlertDialogPrimitive.Trigger

                            const AlertDialogPortal = AlertDialogPrimitive.Portal

                            const AlertDialogOverlay = React.forwardRef(({className, ...props }, ref) => (
                            <AlertDialogPrimitive.Overlay
                                className={cn(
                                    "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                                    className
                                )}
                                {...props}
                                ref={ref} />
                            ))
                            AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

                            const AlertDialogContent = React.forwardRef(({className, ...props }, ref) => (
                            <AlertDialogPortal>
                                <AlertDialogOverlay />
                                <AlertDialogPrimitive.Content
                                    ref={ref}
                                    className={cn(
                                        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
                                        className
                                    )}
                                    {...props} />
                            </AlertDialogPortal>
                            ))
                            AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

                            const AlertDialogHeader = ({
                                className,
  ...props
}) => (
                            <div
                                className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
                                {...props} />
                            )
                            AlertDialogHeader.displayName = "AlertDialogHeader"

                            const AlertDialogFooter = ({
                                className,
  ...props
}) => (
                            <div
                                className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
                                {...props} />
                            )
                            AlertDialogFooter.displayName = "AlertDialogFooter"

                            const AlertDialogTitle = React.forwardRef(({className, ...props }, ref) => (
                            <AlertDialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
                            ))
                            AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

                            const AlertDialogDescription = React.forwardRef(({className, ...props }, ref) => (
                            <AlertDialogPrimitive.Description
                                ref={ref}
                                className={cn("text-sm text-muted-foreground", className)}
                                {...props} />
                            ))
                            AlertDialogDescription.displayName =
                            AlertDialogPrimitive.Description.displayName

                            const AlertDialogAction = React.forwardRef(({className, ...props }, ref) => (
                            <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants(), className)} {...props} />
                            ))
                            AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

                            const AlertDialogCancel = React.forwardRef(({className, ...props }, ref) => (
                            <AlertDialogPrimitive.Cancel
                                ref={ref}
                                className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)}
                                {...props} />
                            ))
                            AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

                            export {
                                AlertDialog,
                                AlertDialogPortal,
                                AlertDialogOverlay,
                                AlertDialogTrigger,
                                AlertDialogContent,
                                AlertDialogHeader,
                                AlertDialogFooter,
                                AlertDialogTitle,
                                AlertDialogDescription,
                                AlertDialogAction,
                                AlertDialogCancel,
}
                            import * as React from "react"
                            import {cva} from "class-variance-authority";

                            import {cn} from "@/lib/utils"

                            const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
                            {
                                variants: {
                                variant: {
        default: "bg-background text-foreground",
                            destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
                            defaultVariants: {
                                variant: "default",
    },
  }
                            )

                            const Alert = React.forwardRef(({className, variant, ...props }, ref) => (
                            <div
                                ref={ref}
                                role="alert"
                                className={cn(alertVariants({ variant }), className)}
                                {...props} />
                            ))
                            Alert.displayName = "Alert"

                            const AlertTitle = React.forwardRef(({className, ...props }, ref) => (
                            <h5
                                ref={ref}
                                className={cn("mb-1 font-medium leading-none tracking-tight", className)}
                                {...props} />
                            ))
                            AlertTitle.displayName = "AlertTitle"

                            const AlertDescription = React.forwardRef(({className, ...props }, ref) => (
                            <div
                                ref={ref}
                                className={cn("text-sm [&_p]:leading-relaxed", className)}
                                {...props} />
                            ))
                            AlertDescription.displayName = "AlertDescription"

                            export {Alert, AlertTitle, AlertDescription}
                            import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio"

                            const AspectRatio = AspectRatioPrimitive.Root

                            export {AspectRatio}
                            "use client"

                            import * as React from "react"
                            import * as AvatarPrimitive from "@radix-ui/react-avatar"

                            import {cn} from "@/lib/utils"

                            const Avatar = React.forwardRef(({className, ...props }, ref) => (
                            <AvatarPrimitive.Root
                                ref={ref}
                                className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
                                {...props} />
                            ))
                            Avatar.displayName = AvatarPrimitive.Root.displayName

                            const AvatarImage = React.forwardRef(({className, ...props }, ref) => (
                            <AvatarPrimitive.Image
                                ref={ref}
                                className={cn("aspect-square h-full w-full", className)}
                                {...props} />
                            ))
                            AvatarImage.displayName = AvatarPrimitive.Image.displayName

                            const AvatarFallback = React.forwardRef(({className, ...props }, ref) => (
                            <AvatarPrimitive.Fallback
                                ref={ref}
                                className={cn(
                                    "flex h-full w-full items-center justify-center rounded-full bg-muted",
                                    className
                                )}
                                {...props} />
                            ))
                            AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

                            export {Avatar, AvatarImage, AvatarFallback}

                            import * as React from "react"
                            import {cva} from "class-variance-authority";

                            import {cn} from "@/lib/utils"

                            const badgeVariants = cva(
                            "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                            {
                                variants: {
                                variant: {
        default:
                            "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
                            secondary:
                            "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                            destructive:
                            "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
                            outline: "text-foreground",
      },
    },
                            defaultVariants: {
                                variant: "default",
    },
  }
                            )

                            function Badge({
                                className,
                                variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

                            export {Badge, badgeVariants}

                            import * as React from "react"
                            import {Slot} from "@radix-ui/react-slot"
                            import {ChevronRight, MoreHorizontal} from "lucide-react"

                            import {cn} from "@/lib/utils"

                            const Breadcrumb = React.forwardRef(
                            ({...props}, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />
                            )
                            Breadcrumb.displayName = "Breadcrumb"

                            const BreadcrumbList = React.forwardRef(({className, ...props }, ref) => (
                            <ol
                                ref={ref}
                                className={cn(
                                    "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
                                    className
                                )}
                                {...props} />
                            ))
                            BreadcrumbList.displayName = "BreadcrumbList"

                            const BreadcrumbItem = React.forwardRef(({className, ...props }, ref) => (
                            <li
                                ref={ref}
                                className={cn("inline-flex items-center gap-1.5", className)}
                                {...props} />
                            ))
                            BreadcrumbItem.displayName = "BreadcrumbItem"

                            const BreadcrumbLink = React.forwardRef(({asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"

                            return (
                            (<Comp
                                ref={ref}
                                className={cn("transition-colors hover:text-foreground", className)}
                                {...props} />)
                            );
})
                            BreadcrumbLink.displayName = "BreadcrumbLink"

                            const BreadcrumbPage = React.forwardRef(({className, ...props }, ref) => (
                            <span
                                ref={ref}
                                role="link"
                                aria-disabled="true"
                                aria-current="page"
                                className={cn("font-normal text-foreground", className)}
                                {...props} />
                            ))
                            BreadcrumbPage.displayName = "BreadcrumbPage"

                            const BreadcrumbSeparator = ({
                                children,
                                className,
  ...props
}) => (
                            <li
                                role="presentation"
                                aria-hidden="true"
                                className={cn("[&>svg]:w-3.5 [&>svg]:h-3.5", className)}
                                {...props}>
                                {children ?? <ChevronRight />}
                            </li>
                            )
                            BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

                            const BreadcrumbEllipsis = ({
                                className,
  ...props
}) => (
                            <span
                                role="presentation"
                                aria-hidden="true"
                                className={cn("flex h-9 w-9 items-center justify-center", className)}
                                {...props}>
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">More</span>
                            </span>
                            )
                            BreadcrumbEllipsis.displayName = "BreadcrumbElipssis"

                            export {
                                Breadcrumb,
                                BreadcrumbList,
                                BreadcrumbItem,
                                BreadcrumbLink,
                                BreadcrumbPage,
                                BreadcrumbSeparator,
                                BreadcrumbEllipsis,
}
                            import * as React from "react"
                            import {Slot} from "@radix-ui/react-slot"
                            import {ChevronRight, MoreHorizontal} from "lucide-react"

                            import {cn} from "@/lib/utils"

                            const Breadcrumb = React.forwardRef(
                            ({...props}, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />
                            )
                            Breadcrumb.displayName = "Breadcrumb"

                            const BreadcrumbList = React.forwardRef(({className, ...props }, ref) => (
                            <ol
                                ref={ref}
                                className={cn(
                                    "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
                                    className
                                )}
                                {...props} />
                            ))
                            BreadcrumbList.displayName = "BreadcrumbList"

                            const BreadcrumbItem = React.forwardRef(({className, ...props }, ref) => (
                            <li
                                ref={ref}
                                className={cn("inline-flex items-center gap-1.5", className)}
                                {...props} />
                            ))
                            BreadcrumbItem.displayName = "BreadcrumbItem"

                            const BreadcrumbLink = React.forwardRef(({asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"

                            return (
                            (<Comp
                                ref={ref}
                                className={cn("transition-colors hover:text-foreground", className)}
                                {...props} />)
                            );
})
                            BreadcrumbLink.displayName = "BreadcrumbLink"

                            const BreadcrumbPage = React.forwardRef(({className, ...props }, ref) => (
                            <span
                                ref={ref}
                                role="link"
                                aria-disabled="true"
                                aria-current="page"
                                className={cn("font-normal text-foreground", className)}
                                {...props} />
                            ))
                            BreadcrumbPage.displayName = "BreadcrumbPage"

                            const BreadcrumbSeparator = ({
                                children,
                                className,
  ...props
}) => (
                            <li
                                role="presentation"
                                aria-hidden="true"
                                className={cn("[&>svg]:w-3.5 [&>svg]:h-3.5", className)}
                                {...props}>
                                {children ?? <ChevronRight />}
                            </li>
                            )
                            BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

                            const BreadcrumbEllipsis = ({
                                className,
  ...props
}) => (
                            <span
                                role="presentation"
                                aria-hidden="true"
                                className={cn("flex h-9 w-9 items-center justify-center", className)}
                                {...props}>
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">More</span>
                            </span>
                            )
                            BreadcrumbEllipsis.displayName = "BreadcrumbElipssis"

                            export {
                                Breadcrumb,
                                BreadcrumbList,
                                BreadcrumbItem,
                                BreadcrumbLink,
                                BreadcrumbPage,
                                BreadcrumbSeparator,
                                BreadcrumbEllipsis,
}
                            import * as React from "react"
                            import {ChevronLeft, ChevronRight} from "lucide-react"
                            import {DayPicker} from "react-day-picker"

                            import {cn} from "@/lib/utils"
                            import {buttonVariants} from "@/components/ui/button"

                            function Calendar({
                                className,
                                classNames,
                                showOutsideDays = true,
  ...props
}) {
  return (
                            (<DayPicker
                                showOutsideDays={showOutsideDays}
                                className={cn("p-3", className)}
                                classNames={{
                                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                    month: "space-y-4",
                                    caption: "flex justify-center pt-1 relative items-center",
                                    caption_label: "text-sm font-medium",
                                    nav: "space-x-1 flex items-center",
                                    nav_button: cn(
                                        buttonVariants({ variant: "outline" }),
                                        "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                                    ),
                                    nav_button_previous: "absolute left-1",
                                    nav_button_next: "absolute right-1",
                                    table: "w-full border-collapse space-y-1",
                                    head_row: "flex",
                                    head_cell:
                                        "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
                                    row: "flex w-full mt-2",
                                    cell: cn(
                                        "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
                                        props.mode === "range"
                                            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
                                            : "[&:has([aria-selected])]:rounded-md"
                                    ),
                                    day: cn(
                                        buttonVariants({ variant: "ghost" }),
                                        "h-8 w-8 p-0 font-normal aria-selected:opacity-100"
                                    ),
                                    day_range_start: "day-range-start",
                                    day_range_end: "day-range-end",
                                    day_selected:
                                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                    import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef(({ className, ...props }, ref) => (
                                        <div
                                            ref={ref}
                                            className={cn("rounded-xl border bg-card text-card-foreground shadow", className)}
                                            {...props} />
                                    ))
Card.displayName = "Card"

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
                                        <div
                                            ref={ref}
                                            className={cn("flex flex-col space-y-1.5 p-6", className)}
                                            {...props} />
                                    ))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
                                        <div
                                            ref={ref}
                                            className={cn("font-semibold leading-none tracking-tight", className)}
                                            {...props} />
                                    ))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
                                        <div
                                            ref={ref}
                                            className={cn("text-sm text-muted-foreground", className)}
                                            {...props} />
                                    ))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
                                        <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
                                    ))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
                                        <div
                                            ref={ref}
                                            className={cn("flex items-center p-6 pt-0", className)}
                                            {...props} />
                                    ))
CardFooter.displayName = "CardFooter"
import * as React from "react"
import useEmblaCarousel from "embla-carousel-react";
                                    import { ArrowLeft, ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const CarouselContext = React.createContext(null)

function useCarousel() {
  const context= React.useContext(CarouselContext)

                            if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

                            return context
}

                            const Carousel = React.forwardRef((
                            {
                                orientation = "horizontal",
                                opts,
                                setApi,
                                plugins,
                                className,
                                children,
    ...props
  },
                            ref
) => {
  const [carouselRef, api] = useEmblaCarousel({
                                ...opts,
                                axis: orientation === "horizontal" ? "x" : "y",
  }, plugins)
                            const [canScrollPrev, setCanScrollPrev] = React.useState(false)
                            const [canScrollNext, setCanScrollNext] = React.useState(false)

  const onSelect = React.useCallback((api) => {
    if (!api) {
      return
    }

                            setCanScrollPrev(api.canScrollPrev())
                            setCanScrollNext(api.canScrollNext())
  }, [])

  const scrollPrev = React.useCallback(() => {
                                "use client";
                            import * as React from "react"
                            import * as RechartsPrimitive from "recharts"

                            import {cn} from "@/lib/utils"

// Format: {THEME_NAME: CSS_SELECTOR }
                            const THEMES = {
                                light: "",
                            dark: ".dark"
}

                            const ChartContext = React.createContext(null)

                            function useChart() {
  const context = React.useContext(ChartContext)

                            if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

                            return context
}

                            const ChartContainer = React.forwardRef(({id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
                            const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

                            return (
                            (<ChartContext.Provider value={{ config }}>
                                <div
                                    data-chart={chartId}
                                    ref={ref}
                                    className={cn(
                                        "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
                                        className
                                    )}
                                    {...props}>
                                    <ChartStyle id={chartId} config={config} />
                                    <RechartsPrimitive.ResponsiveContainer>
                                        {children}
                                    </RechartsPrimitive.ResponsiveContainer>
                                </div>
                            </ChartContext.Provider>)
                            );
})
                            ChartContainer.displayName = "Chart"

                            const ChartStyle = ({
                                id,
                                config
                            }) => {
  const colorConfig = Object.entries(config).filter(([, config]) => config.theme || config.color)

                            if (!colorConfig.length) {
    return null
  }

                            return (
                            (<style
                                dangerouslySetInnerHTML={{
                                    __html: Object.entries(THEMES)
                                        .map(([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
                                                .map(([key, itemConfig]) => {
                                                    const color =
                                                        itemConfig.theme?.[theme] ||
                                                        itemConfig.color
                                                    return color ? `  --color-${key}: ${color};` : null
                                                })
                                                .join("\n")}
}
`)
                                        .join("\n"),
                                }} />)
                            );
}

                            const ChartTooltip = RechartsPrimitive.Tooltip

                            const ChartTooltipContent = React.forwardRef((
                            {
                                active,
                                payload,
                                className,
                                indicator = "dot",
                                hideLabel = false,
                                hideIndicator = false,
                                label,
                                labelFormatter,
                                labelClassName,
                                formatter,
                                color,
                                nameKey,
                                labelKey,
  },
                            ref
) => {
  const {config} = useChart()

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null
    }

                            const [item] = payload
                            const key = `${labelKey || item.dataKey || item.name || "value"}`
                            const itemConfig = getPayloadConfigFromPayload(config, item, key)
                            const value =
                            !labelKey && typeof label === "string"
                            ? config[label]?.label || label
                            : itemConfig?.label

                            if (labelFormatter) {
      return (
                            (<div className={cn("font-medium", labelClassName)}>
                                {labelFormatter(value, payload)}
                            </div>)
                            );
    }

                            if (!value) {
      return null
    }

                            return <div className={cn("font-medium", labelClassName)}>{value}</div>;
  }, [
                            label,
                            labelFormatter,
                            payload,
                            hideLabel,
                            labelClassName,
                            config,
                            labelKey,
                            ])

                            if (!active || !payload?.length) {
    return null
  }

                            const nestLabel = payload.length === 1 && indicator !== "dot"

                            return (
                            (<div
                                ref={ref}
                                className={cn(
                                    "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
                                    className
                                )}>
                                {!nestLabel ? tooltipLabel : null}
                                <div className="grid gap-1.5">
                                    {payload.map((item, index) => {
                                        const key = `${nameKey || item.name || item.dataKey || "value"}`
                                        const itemConfig = getPayloadConfigFromPayload(config, item, key)
                                        const indicatorColor = color || item.payload.fill || item.color

                                        return (
                                            (<div
                                                key={item.dataKey}
                                                className={cn(
                                                    "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                                                    indicator === "dot" && "items-center"
                                                )}>
                                                {formatter && item?.value !== undefined && item.name ? (
                                                    formatter(item.value, item.name, item, index, item.payload)
                                                ) : (
                                                    <>
                                                        {itemConfig?.icon ? (
                                                            <itemConfig.icon />
                                                        ) : (
                                                            !hideIndicator && (
                                                                <div
                                                                    className={cn("shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]", {
                                                                        "h-2.5 w-2.5": indicator === "dot",
                                                                        "w-1": indicator === "line",
                                                                        "w-0 border-[1.5px] border-dashed bg-transparent":
                                                                            indicator === "dashed",
                                                                        "my-0.5": nestLabel && indicator === "dashed",
                                                                    })}
                                                                    style={
                                                                        {
                                                                            "--color-bg": indicatorColor,
                                                                            "--color-border": indicatorColor
                                                                        }
                                                                    } />
                                                            )
                                                        )}
                                                        <div
                                                            className={cn(
                                                                "flex flex-1 justify-between leading-none",
                                                                nestLabel ? "items-end" : "items-center"
                                                            )}>
                                                            <div className="grid gap-1.5">
                                                                {nestLabel ? tooltipLabel : null}
                                                                <span className="text-muted-foreground">
                                                                    {itemConfig?.label || item.name}
                                                                </span>
                                                            </div>
                                                            {item.value && (
                                                                <span className="font-mono font-medium tabular-nums text-foreground">
                                                                    {item.value.toLocaleString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>)
                                        );
                                    })}
                                </div>
                            </div>)
                            );
})
                            ChartTooltipContent.displayName = "ChartTooltip"

                            const ChartLegend = RechartsPrimitive.Legend

                            const ChartLegendContent = React.forwardRef((
                            {className, hideIcon = false, payload, verticalAlign = "bottom", nameKey},
                            ref
) => {
  const {config} = useChart()

                            if (!payload?.length) {
    return null
  }

                            return (
                            (<div
                                ref={ref}
                                className={cn(
                                    "flex items-center justify-center gap-4",
                                    verticalAlign === "top" ? "pb-3" : "pt-3",
                                    className
                                )}>
                                {payload.map((item) => {
                                    const key = `${nameKey || item.dataKey || "value"}`
                                    const itemConfig = getPayloadConfigFromPayload(config, item, key)

                                    return (
                                        (<div
                                            key={item.value}
                                            className={cn(
                                                "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
                                            )}>
                                            {itemConfig?.icon && !hideIcon ? (
                                                <itemConfig.icon />
                                            ) : (
                                                <div
                                                    className="h-2 w-2 shrink-0 rounded-[2px]"
                                                    style={{
                                                        backgroundColor: item.color,
                                                    }} />
                                            )}
                                            {itemConfig?.label}
                                        </div>)
                                    );
                                })}
                            </div>)
                            );
})
                            ChartLegendContent.displayName = "ChartLegend"

                            // Helper to extract item config from a payload.
                            function getPayloadConfigFromPayload(
                            config,
                            payload,
                            key
                            ) {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

                            const payloadPayload =
                            "payload" in payload &&
                            typeof payload.payload === "object" &&
                            payload.payload !== null
                            ? payload.payload
                            : undefined

                            let configLabelKey = key

                            if (
                            key in payload &&
                            typeof payload[key] === "string"
                            ) {
                                configLabelKey = payload[key]
                            } else if (
                            payloadPayload &&
                            key in payloadPayload &&
                            typeof payloadPayload[key] === "string"
                            ) {
                                configLabelKey = payloadPayload[key]
                            }

                            return configLabelKey in config
                            ? config[configLabelKey]
                            : config[key];
}

                            export {
                                ChartContainer,
                                ChartTooltip,
                                ChartTooltipContent,
                                ChartLegend,
                                ChartLegendContent,
                                ChartStyle,
}
                            import * as React from "react"
                            import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
                            import {Check} from "lucide-react"

                            import {cn} from "@/lib/utils"

                            const Checkbox = React.forwardRef(({className, ...props }, ref) => (
                            <CheckboxPrimitive.Root
                                ref={ref}
                                className={cn(
                                    "peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
                                    className
                                )}
                                {...props}>
                                <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
                                    <Check className="h-4 w-4" />
                                </CheckboxPrimitive.Indicator>
                            </CheckboxPrimitive.Root>
                            ))
                            Checkbox.displayName = CheckboxPrimitive.Root.displayName

                            export {Checkbox}
                            "use client"

                            import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

                            const Collapsible = CollapsiblePrimitive.Root

                            const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

                            const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent

                            export {Collapsible, CollapsibleTrigger, CollapsibleContent}
                            import * as React from "react"
                            import {Command as CommandPrimitive} from "cmdk"
                            import {Search} from "lucide-react"

                            import {cn} from "@/lib/utils"
                            import {Dialog, DialogContent} from "@/components/ui/dialog"

                            const Command = React.forwardRef(({className, ...props }, ref) => (
                            <CommandPrimitive
                                ref={ref}
                                className={cn(
                                    "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
                                    className
                                )}
                                {...props} />
                            ))
                            Command.displayName = CommandPrimitive.displayName

                            const CommandDialog = ({
                                children,
  ...props
}) => {
  return (
                            (<Dialog {...props}>
                                <DialogContent className="overflow-hidden p-0">
                                    <Command
                                        className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
                                        {children}
                                    </Command>
                                </DialogContent>
                            </Dialog>)
                            );
}

                            const CommandInput = React.forwardRef(({className, ...props }, ref) => (
                            <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                <CommandPrimitive.Input
                                    ref={ref}
                                    className={cn(
                                        "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
                                        className
                                    )}
                                    {...props} />
                            </div>
                            ))

                            CommandInput.displayName = CommandPrimitive.Input.displayName

                            const CommandList = React.forwardRef(({className, ...props }, ref) => (
                            <CommandPrimitive.List
                                ref={ref}
                                className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
                                {...props} />
                            ))

                            CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef((props, ref) => (
                            <CommandPrimitive.Empty ref={ref} className="py-6 text-center text-sm" {...props} />
                            ))

                            CommandEmpty.displayName = CommandPrimitive.Empty.displayName

                            const CommandGroup = React.forwardRef(({className, ...props }, ref) => (
                            <CommandPrimitive.Group
                                ref={ref}
                                className={cn(
                                    "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
                                    className
                                )}
                                {...props} />
                            ))

                            CommandGroup.displayName = CommandPrimitive.Group.displayName

                            const CommandSeparator = React.forwardRef(({className, ...props }, ref) => (
                            <CommandPrimitive.Separator ref={ref} className={cn("-mx-1 h-px bg-border", className)} {...props} />
                            ))
                            CommandSeparator.displayName = CommandPrimitive.Separator.displayName

                            const CommandItem = React.forwardRef(({className, ...props }, ref) => (
                            <CommandPrimitive.Item
                                ref={ref}
                                className={cn(
                                    "relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
                                    className
                                )}
                                {...props} />
                            ))

                            CommandItem.displayName = CommandPrimitive.Item.displayName

                            const CommandShortcut = ({
                                className,
  ...props
}) => {
  return (
                            (<span
                                className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
                                {...props} />)
                            );
}
                            CommandShortcut.displayName = "CommandShortcut"

                            export {
                                Command,
                                CommandDialog,
                                CommandInput,
                                CommandList,
                                CommandEmpty,
                                CommandGroup,
                                CommandItem,
                                CommandShortcut,
                                CommandSeparator,
}
                            import * as React from "react"
                            import * as ContextMenuPrimitive from "@radix-ui/react-context-menu"
                            import {Check, ChevronRight, Circle} from "lucide-react"

                            import {cn} from "@/lib/utils"

                            const ContextMenu = ContextMenuPrimitive.Root

                            const ContextMenuTrigger = ContextMenuPrimitive.Trigger

                            const ContextMenuGroup = ContextMenuPrimitive.Group

                            const ContextMenuPortal = ContextMenuPrimitive.Portal

                            const ContextMenuSub = ContextMenuPrimitive.Sub

                            const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup

                            const ContextMenuSubTrigger = React.forwardRef(({className, inset, children, ...props }, ref) => (
                            <ContextMenuPrimitive.SubTrigger
                                ref={ref}
                                className={cn(
                                    "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
                                    inset && "pl-8",
                                    className
                                )}
                                {...props}>
                                {children}
                                <ChevronRight className="ml-auto h-4 w-4" />
                            </ContextMenuPrimitive.SubTrigger>
                            ))
                            ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName

                            const ContextMenuSubContent = React.forwardRef(({className, ...props }, ref) => (
                            <ContextMenuPrimitive.SubContent
                                ref={ref}
                                className={cn(
                                    "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                                    className
                                )}
                                {...props} />
                            ))
                            ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName

                            const ContextMenuContent = React.forwardRef(({className, ...props }, ref) => (
                            <ContextMenuPrimitive.Portal>
                                <ContextMenuPrimitive.Content
                                    ref={ref}
                                    className={cn(
                                        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                                        className
                                    )}
                                    {...props} />
                            </ContextMenuPrimitive.Portal>
                            ))
                            ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName

                            const ContextMenuItem = React.forwardRef(({className, inset, ...props }, ref) => (
                            <ContextMenuPrimitive.Item
                                ref={ref}
                                className={cn(
                                    "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                    inset && "pl-8",
                                    className
                                )}
                                {...props} />
                            ))
                            ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName

                            const ContextMenuCheckboxItem = React.forwardRef(({className, children, checked, ...props }, ref) => (
                            <ContextMenuPrimitive.CheckboxItem
                                ref={ref}
                                className={cn(
                                    "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                    className
                                )}
                                checked={checked}
                                {...props}>
                                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                    <ContextMenuPrimitive.ItemIndicator>
                                        <Check className="h-4 w-4" />
                                    </ContextMenuPrimitive.ItemIndicator>
                                </span>
                                {children}
                            </ContextMenuPrimitive.CheckboxItem>
                            ))
                            ContextMenuCheckboxItem.displayName =
                            ContextMenuPrimitive.CheckboxItem.displayName

                            const ContextMenuRadioItem = React.forwardRef(({className, children, ...props }, ref) => (
                            <ContextMenuPrimitive.RadioItem
                                ref={ref}
                                className={cn(
                                    "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                    className
                                )}
                                {...props}>
                                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                    <ContextMenuPrimitive.ItemIndicator>
                                        <Circle className="h-4 w-4 fill-current" />
                                    </ContextMenuPrimitive.ItemIndicator>
                                </span>
                                {children}
                            </ContextMenuPrimitive.RadioItem>
                            ))
                            ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName

                            const ContextMenuLabel = React.forwardRef(({className, inset, ...props }, ref) => (
                            <ContextMenuPrimitive.Label
                                ref={ref}
                                className={cn(
                                    "px-2 py-1.5 text-sm font-semibold text-foreground",
                                    inset && "pl-8",
                                    className
                                )}
                                {...props} />
                            ))
                            ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName

                            const ContextMenuSeparator = React.forwardRef(({className, ...props }, ref) => (
                            <ContextMenuPrimitive.Separator
                                ref={ref}
                                className={cn("-mx-1 my-1 h-px bg-border", className)}
                                {...props} />
                            ))
                            ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName

                            const ContextMenuShortcut = ({
                                className,
  ...props
}) => {
  return (
                            (<span
                                className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
                                {...props} />)
                            );
}
                            ContextMenuShortcut.displayName = "ContextMenuShortcut"

                            export {
                                ContextMenu,
                                ContextMenuTrigger,
                                ContextMenuContent,
                                ContextMenuItem,
                                ContextMenuCheckboxItem,
                                ContextMenuRadioItem,
                                ContextMenuLabel,
                                ContextMenuSeparator,
                                ContextMenuShortcut,
                                ContextMenuGroup,
                                ContextMenuPortal,
                                ContextMenuSub,
                                ContextMenuSubContent,
                                ContextMenuSubTrigger,
                                ContextMenuRadioGroup,
}

                            "use client"

                            import * as React from "react"
                            import * as DialogPrimitive from "@radix-ui/react-dialog"
                            import {X} from "lucide-react"

                            import {cn} from "@/lib/utils"

                            const Dialog = DialogPrimitive.Root

                            const DialogTrigger = DialogPrimitive.Trigger

                            const DialogPortal = DialogPrimitive.Portal

                            const DialogClose = DialogPrimitive.Close

                            const DialogOverlay = React.forwardRef(({className, ...props }, ref) => (
                            <DialogPrimitive.Overlay
                                ref={ref}
                                className={cn(
                                    "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                                    className
                                )}
                                {...props} />
                            ))
                            DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

                            const DialogContent = React.forwardRef(({className, children, ...props }, ref) => (
                            <DialogPortal>
                                <DialogOverlay />
                                <DialogPrimitive.Content
                                    ref={ref}
                                    className={cn(
                                        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
                                        className
                                    )}
                                    {...props}>
                                    {children}
                                    <DialogPrimitive.Close
                                        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                                        <X className="h-4 w-4" />
                                        <span className="sr-only">Close</span>
                                    </DialogPrimitive.Close>
                                </DialogPrimitive.Content>
                            </DialogPortal>
                            ))
                            DialogContent.displayName = DialogPrimitive.Content.displayName

                            const DialogHeader = ({
                                className,
  ...props
}) => (
                            <div
                                className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
                                {...props} />
                            )
                            DialogHeader.displayName = "DialogHeader"

                            const DialogFooter = ({
                                className,
  ...props
}) => (
                            <div
                                className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
                                {...props} />
                            )
                            DialogFooter.displayName = "DialogFooter"

                            const DialogTitle = React.forwardRef(({className, ...props }, ref) => (
                            <DialogPrimitive.Title
                                ref={ref}
                                className={cn("text-lg font-semibold leading-none tracking-tight", className)}
                                {...props} />
                            ))
                            DialogTitle.displayName = DialogPrimitive.Title.displayName

                            const DialogDescription = React.forwardRef(({className, ...props }, ref) => (
                            <DialogPrimitive.Description
                                ref={ref}
                                className={cn("text-sm text-muted-foreground", className)}
                                {...props} />
                            ))
                            DialogDescription.displayName = DialogPrimitive.Description.displayName

                            export {
                                Dialog,
                                DialogPortal,
                                DialogOverlay,
                                DialogTrigger,
                                DialogClose,
                                DialogContent,
                                DialogHeader,
                                DialogFooter,
                                DialogTitle,
                                DialogDescription,
}

                            "use client"

                            import * as React from "react"
                            import {Drawer as DrawerPrimitive} from "vaul"

                            import {cn} from "@/lib/utils"

                            const Drawer = ({
                                shouldScaleBackground = true,
  ...props
}) => (
                            <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
                            )
                            Drawer.displayName = "Drawer"

                            const DrawerTrigger = DrawerPrimitive.Trigger

                            const DrawerPortal = DrawerPrimitive.Portal

                            const DrawerClose = DrawerPrimitive.Close

                            const DrawerOverlay = React.forwardRef(({className, ...props }, ref) => (
                            <DrawerPrimitive.Overlay
                                ref={ref}
                                className={cn("fixed inset-0 z-50 bg-black/80", className)}
                                {...props} />
                            ))
                            DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

                            const DrawerContent = React.forwardRef(({className, children, ...props }, ref) => (
                            <DrawerPortal>
                                <DrawerOverlay />
                                <DrawerPrimitive.Content
                                    ref={ref}
                                    className={cn(
                                        "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
                                        className
                                    )}
                                    {...props}>
                                    <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
                                    {children}
                                </DrawerPrimitive.Content>
                            </DrawerPortal>
                            ))
                            DrawerContent.displayName = "DrawerContent"

                            const DrawerHeader = ({
                                className,
  ...props
}) => (
                            <div
                                className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
                                {...props} />
                            )
                            DrawerHeader.displayName = "DrawerHeader"

                            const DrawerFooter = ({
                                className,
  ...props
}) => (
                            <div className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
                            )
                            DrawerFooter.displayName = "DrawerFooter"

                            const DrawerTitle = React.forwardRef(({className, ...props }, ref) => (
                            <DrawerPrimitive.Title
                                ref={ref}
                                className={cn("text-lg font-semibold leading-none tracking-tight", className)}
                                {...props} />
                            ))
                            DrawerTitle.displayName = DrawerPrimitive.Title.displayName

                            const DrawerDescription = React.forwardRef(({className, ...props }, ref) => (
                            <DrawerPrimitive.Description
                                ref={ref}
                                className={cn("text-sm text-muted-foreground", className)}
                                {...props} />
                            ))
                            DrawerDescription.displayName = DrawerPrimitive.Description.displayName

                            export {
                                Drawer,
                                DrawerPortal,
                                DrawerOverlay,
                                DrawerTrigger,
                                DrawerClose,
                                DrawerContent,
                                DrawerHeader,
                                DrawerFooter,
                                DrawerTitle,
                                DrawerDescription,
}
                            import * as React from "react"
                            import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
                            import {Check, ChevronRight, Circle} from "lucide-react"

                            import {cn} from "@/lib/utils"

                            const DropdownMenu = DropdownMenuPrimitive.Root

                            const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

                            const DropdownMenuGroup = DropdownMenuPrimitive.Group

                            const DropdownMenuPortal = DropdownMenuPrimitive.Portal

                            const DropdownMenuSub = DropdownMenuPrimitive.Sub

                            const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

                            const DropdownMenuSubTrigger = React.forwardRef(({className, inset, children, ...props }, ref) => (
                            <DropdownMenuPrimitive.SubTrigger
                                ref={ref}
                                className={cn(
                                    "flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
                                    inset && "pl-8",
                                    className
                                )}
                                {...props}>
                                {children}
                                <ChevronRight className="ml-auto" />
                            </DropdownMenuPrimitive.SubTrigger>
                            ))
                            DropdownMenuSubTrigger.displayName =
                            DropdownMenuPrimitive.SubTrigger.displayName

                            const DropdownMenuSubContent = React.forwardRef(({className, ...props }, ref) => (
                            <DropdownMenuPrimitive.SubContent
                                ref={ref}
                                className={cn(
                                    "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                                    className
                                )}
                                {...props} />
                            ))
                            DropdownMenuSubContent.displayName =
                            DropdownMenuPrimitive.SubContent.displayName

                            const DropdownMenuContent = React.forwardRef(({className, sideOffset = 4, ...props }, ref) => (
                            <DropdownMenuPrimitive.Portal>
                                <DropdownMenuPrimitive.Content
                                    ref={ref}
                                    sideOffset={sideOffset}
                                    className={cn(
                                        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
                                        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                                        className
                                    )}
                                    {...props} />
                            </DropdownMenuPrimitive.Portal>
                            ))
                            DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

                            const DropdownMenuItem = React.forwardRef(({className, inset, ...props }, ref) => (
                            <DropdownMenuPrimitive.Item
                                ref={ref}
                                className={cn(
                                    "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
                                    inset && "pl-8",
                                    className
                                )}
                                {...props} />
                            ))
                            DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

                            const DropdownMenuCheckboxItem = React.forwardRef(({className, children, checked, ...props }, ref) => (
                            <DropdownMenuPrimitive.CheckboxItem
                                ref={ref}
                                className={cn(
                                    "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                    className
                                )}
                                checked={checked}
                                {...props}>
                                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                    <DropdownMenuPrimitive.ItemIndicator>
                                        <Check className="h-4 w-4" />
                                    </DropdownMenuPrimitive.ItemIndicator>
                                </span>
                                {children}
                            </DropdownMenuPrimitive.CheckboxItem>
                            ))
                            DropdownMenuCheckboxItem.displayName =
                            DropdownMenuPrimitive.CheckboxItem.displayName

                            const DropdownMenuRadioItem = React.forwardRef(({className, children, ...props }, ref) => (
                            <DropdownMenuPrimitive.RadioItem
                                ref={ref}
                                className={cn(
                                    "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                    className
                                )}
                                {...props}>
                                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                    <DropdownMenuPrimitive.ItemIndicator>
                                        <Circle className="h-2 w-2 fill-current" />
                                    </DropdownMenuPrimitive.ItemIndicator>
                                </span>
                                {children}
                            </DropdownMenuPrimitive.RadioItem>
                            ))
                            DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

                            const DropdownMenuLabel = React.forwardRef(({className, inset, ...props }, ref) => (
                            <DropdownMenuPrimitive.Label
                                ref={ref}
                                className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
                                {...props} />
                            ))
                            DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

                            const DropdownMenuSeparator = React.forwardRef(({className, ...props }, ref) => (
                            <DropdownMenuPrimitive.Separator
                                ref={ref}
                                className={cn("-mx-1 my-1 h-px bg-muted", className)}
                                {...props} />
                            ))
                            DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

                            const DropdownMenuShortcut = ({
                                className,
  ...props
}) => {
  return (
                            (<span
                                className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
                                {...props} />)
                            );
}
                            DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

                            export {
                                DropdownMenu,
                                DropdownMenuTrigger,
                                DropdownMenuContent,
                                DropdownMenuItem,
                                DropdownMenuCheckboxItem,
                                DropdownMenuRadioItem,
                                DropdownMenuLabel,
                                DropdownMenuSeparator,
                                DropdownMenuShortcut,
                                DropdownMenuGroup,
                                DropdownMenuPortal,
                                DropdownMenuSub,
                                DropdownMenuSubContent,
                                DropdownMenuSubTrigger,
                                DropdownMenuRadioGroup,
}
                            "use client";
                            import * as React from "react"
                            import {Slot} from "@radix-ui/react-slot"
                            import {Controller, FormProvider, useFormContext} from "react-hook-form";

                            import {cn} from "@/lib/utils"
                            import {Label} from "@/components/ui/label"

                            const Form = FormProvider

                            const FormFieldContext = React.createContext({ })

                            const FormField = (
                            {
                                ...props
                            }
) => {
  return (
                            (<FormFieldContext.Provider value={{ name: props.name }}>
                                <Controller {...props} />
                            </FormFieldContext.Provider>)
                            );
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
                            const itemContext = React.useContext(FormItemContext)
                            const {getFieldState, formState} = useFormContext()

                            const fieldState = getFieldState(fieldContext.name, formState)

                            if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

                                const {id} = itemContext

                                return {
                                    id,
                                    name: fieldContext.name,
                                formItemId: `${id}-form-item`,
                                formDescriptionId: `${id}-form-item-description`,
                                formMessageId: `${id}-form-item-message`,
                                ...fieldState,
  }
}

                                const FormItemContext = React.createContext({ })

                                const FormItem = React.forwardRef(({className, ...props }, ref) => {
  const id = React.useId()

                                return (
                                (<FormItemContext.Provider value={{ id }}>
                                    <div ref={ref} className={cn("space-y-2", className)} {...props} />
                                </FormItemContext.Provider>)
                                );
})
                                FormItem.displayName = "FormItem"

                                const FormLabel = React.forwardRef(({className, ...props }, ref) => {
  const {error, formItemId} = useFormField()

                                return (
                                (<Label
                                    ref={ref}
                                    className={cn(error && "text-destructive", className)}
                                    htmlFor={formItemId}
                                    {...props} />)
                                );
})
                                FormLabel.displayName = "FormLabel"

                                const FormControl = React.forwardRef(({...props}, ref) => {
  const {error, formItemId, formDescriptionId, formMessageId} = useFormField()

                                return (
                                (<Slot
                                    ref={ref}
                                    id={formItemId}
                                    aria-describedby={
                                        !error
                                            ? `${formDescriptionId}`
                                            : `${formDescriptionId} ${formMessageId}`
                                    }
                                    aria-invalid={!!error}
                                    {...props} />)
                                );
})
                                FormControl.displayName = "FormControl"

                                const FormDescription = React.forwardRef(({className, ...props }, ref) => {
  const {formDescriptionId} = useFormField()

                                return (
                                (<p
                                    ref={ref}
                                    id={formDescriptionId}
                                    className={cn("text-[0.8rem] text-muted-foreground", className)}
                                    {...props} />)
                                );
})
                                FormDescription.displayName = "FormDescription"

                                const FormMessage = React.forwardRef(({className, children, ...props }, ref) => {
  const {error, formMessageId} = useFormField()
                                const body = error ? String(error?.message) : children

                                if (!body) {
    return null
  }

                                return (
                                (<p
                                    ref={ref}
                                    id={formMessageId}
                                    className={cn("text-[0.8rem] font-medium text-destructive", className)}
                                    {...props}>
                                    {body}
                                </p>)
                                );
})
                                FormMessage.displayName = "FormMessage"

                                export {
                                    useFormField,
                                    Form,
                                    FormItem,
                                    FormLabel,
                                    FormControl,
                                    FormDescription,
                                    FormMessage,
                                    FormField,
}
                                "use client"

                                import * as React from "react"
                                import * as HoverCardPrimitive from "@radix-ui/react-hover-card"

                                import {cn} from "@/lib/utils"

                                const HoverCard = HoverCardPrimitive.Root

                                const HoverCardTrigger = HoverCardPrimitive.Trigger

                                const HoverCardContent = React.forwardRef(({className, align = "center", sideOffset = 4, ...props }, ref) => (
                                <HoverCardPrimitive.Content
                                    ref={ref}
                                    align={align}
                                    sideOffset={sideOffset}
                                    className={cn(
                                        "z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                                        className
                                    )}
                                    {...props} />
                                ))
                                HoverCardContent.displayName = HoverCardPrimitive.Content.displayName

                                export {HoverCard, HoverCardTrigger, HoverCardContent}
                                import * as React from "react"
                                import {OTPInput, OTPInputContext} from "input-otp"
                                import {Minus} from "lucide-react"

                                import {cn} from "@/lib/utils"

                                const InputOTP = React.forwardRef(({className, containerClassName, ...props }, ref) => (
                                <OTPInput
                                    ref={ref}
                                    containerClassName={cn("flex items-center gap-2 has-[:disabled]:opacity-50", containerClassName)}
                                    className={cn("disabled:cursor-not-allowed", className)}
                                    {...props} />
                                ))
                                InputOTP.displayName = "InputOTP"

                                const InputOTPGroup = React.forwardRef(({className, ...props }, ref) => (
                                <div ref={ref} className={cn("flex items-center", className)} {...props} />
                                ))
                                InputOTPGroup.displayName = "InputOTPGroup"

                                const InputOTPSlot = React.forwardRef(({index, className, ...props }, ref) => {
  const inputOTPContext = React.useContext(OTPInputContext)
                                const {char, hasFakeCaret, isActive} = inputOTPContext.slots[index]

                                return (
                                (<div
                                    ref={ref}
                                    className={cn(
                                        "relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
                                        isActive && "z-10 ring-1 ring-ring",
                                        className
                                    )}
                                    {...props}>
                                    {char}
                                    {hasFakeCaret && (
                                        <div
                                            className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                            <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
                                        </div>
                                    )}
                                </div>)
                                );
})
                                InputOTPSlot.displayName = "InputOTPSlot"

                                const InputOTPSeparator = React.forwardRef(({...props}, ref) => (
                                <div ref={ref} role="separator" {...props}>
                                    <Minus />
                                </div>
                                ))
                                InputOTPSeparator.displayName = "InputOTPSeparator"

                                export {InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator}
                                import * as React from "react"

                                import {cn} from "@/lib/utils"

                                const Input = React.forwardRef(({className, type, ...props }, ref) => {
  return (
                                (<input
                                    type={type}
                                    className={cn(
                                        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                                        className
                                    )}
                                    ref={ref}
                                    {...props} />)
                                );
})
                                Input.displayName = "Input"

                                export {Input}
                                import * as React from "react"
                                import * as LabelPrimitive from "@radix-ui/react-label"
                                import {cva} from "class-variance-authority";

                                import {cn} from "@/lib/utils"

                                const labelVariants = cva(
                                "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                )

                                const Label = React.forwardRef(({className, ...props }, ref) => (
                                <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
                                ))
                                Label.displayName = LabelPrimitive.Root.displayName

                                export {Label}
                                "use client"

                                import * as React from "react"
                                import * as MenubarPrimitive from "@radix-ui/react-menubar"
                                import {Check, ChevronRight, Circle} from "lucide-react"

                                import {cn} from "@/lib/utils"

                                function MenubarMenu({
                                    ...props
                                }) {
  return <MenubarPrimitive.Menu {...props} />;
}

                                function MenubarGroup({
                                    ...props
                                }) {
  return <MenubarPrimitive.Group {...props} />;
}

                                function MenubarPortal({
                                    ...props
                                }) {
  return <MenubarPrimitive.Portal {...props} />;
}

                                function MenubarRadioGroup({
                                    ...props
                                }) {
  return <MenubarPrimitive.RadioGroup {...props} />;
}

                                function MenubarSub({
                                    ...props
                                }) {
  return <MenubarPrimitive.Sub data-slot="menubar-sub" {...props} />;
}

                                const Menubar = React.forwardRef(({className, ...props }, ref) => (
                                <MenubarPrimitive.Root
                                    ref={ref}
                                    className={cn(
                                        "flex h-9 items-center space-x-1 rounded-md border bg-background p-1 shadow-sm",
                                        className
                                    )}
                                    {...props} />
                                ))
                                Menubar.displayName = MenubarPrimitive.Root.displayName

                                const MenubarTrigger = React.forwardRef(({className, ...props }, ref) => (
                                <MenubarPrimitive.Trigger
                                    ref={ref}
                                    className={cn(
                                        "flex cursor-default select-none items-center rounded-sm px-3 py-1 text-sm font-medium outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
                                        className
                                    )}
                                    {...props} />
                                ))
                                MenubarTrigger.displayName = MenubarPrimitive.Trigger.displayName

                                const MenubarSubTrigger = React.forwardRef(({className, inset, children, ...props }, ref) => (
                                <MenubarPrimitive.SubTrigger
                                    ref={ref}
                                    className={cn(
                                        "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
                                        inset && "pl-8",
                                        className
                                    )}
                                    {...props}>
                                    {children}
                                    <ChevronRight className="ml-auto h-4 w-4" />
                                </MenubarPrimitive.SubTrigger>
                                ))
                                MenubarSubTrigger.displayName = MenubarPrimitive.SubTrigger.displayName

                                const MenubarSubContent = React.forwardRef(({className, ...props }, ref) => (
                                <MenubarPrimitive.SubContent
                                    ref={ref}
                                    className={cn(
                                        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                                        className
                                    )}
                                    {...props} />
                                ))
                                MenubarSubContent.displayName = MenubarPrimitive.SubContent.displayName

                                const MenubarContent = React.forwardRef((
                                {className, align = "start", alignOffset = -4, sideOffset = 8, ...props },
                                ref
) => (
                                <MenubarPrimitive.Portal>
                                    <MenubarPrimitive.Content
                                        ref={ref}
                                        align={align}
                                        alignOffset={alignOffset}
                                        sideOffset={sideOffset}
                                        className={cn(
                                            "z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                                            className
                                        )}
                                        {...props} />
                                </MenubarPrimitive.Portal>
                                ))
                                MenubarContent.displayName = MenubarPrimitive.Content.displayName

                                const MenubarItem = React.forwardRef(({className, inset, ...props }, ref) => (
                                <MenubarPrimitive.Item
                                    ref={ref}
                                    className={cn(
                                        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                        inset && "pl-8",
                                        className
                                    )}
                                    {...props} />
                                ))
                                MenubarItem.displayName = MenubarPrimitive.Item.displayName

                                const MenubarCheckboxItem = React.forwardRef(({className, children, checked, ...props }, ref) => (
                                <MenubarPrimitive.CheckboxItem
                                    ref={ref}
                                    className={cn(
                                        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                        className
                                    )}
                                    checked={checked}
                                    {...props}>
                                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                        <MenubarPrimitive.ItemIndicator>
                                            <Check className="h-4 w-4" />
                                        </MenubarPrimitive.ItemIndicator>
                                    </span>
                                    {children}
                                </MenubarPrimitive.CheckboxItem>
                                ))
                                MenubarCheckboxItem.displayName = MenubarPrimitive.CheckboxItem.displayName

                                const MenubarRadioItem = React.forwardRef(({className, children, ...props }, ref) => (
                                <MenubarPrimitive.RadioItem
                                    ref={ref}
                                    className={cn(
                                        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                        className
                                    )}
                                    {...props}>
                                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                        <MenubarPrimitive.ItemIndicator>
                                            <Circle className="h-4 w-4 fill-current" />
                                        </MenubarPrimitive.ItemIndicator>
                                    </span>
                                    {children}
                                </MenubarPrimitive.RadioItem>
                                ))
                                MenubarRadioItem.displayName = MenubarPrimitive.RadioItem.displayName

                                const MenubarLabel = React.forwardRef(({className, inset, ...props }, ref) => (
                                <MenubarPrimitive.Label
                                    ref={ref}
                                    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
                                    {...props} />
                                ))
                                MenubarLabel.displayName = MenubarPrimitive.Label.displayName

                                const MenubarSeparator = React.forwardRef(({className, ...props }, ref) => (
                                <MenubarPrimitive.Separator
                                    ref={ref}
                                    className={cn("-mx-1 my-1 h-px bg-muted", className)}
                                    {...props} />
                                ))
                                MenubarSeparator.displayName = MenubarPrimitive.Separator.displayName

                                const MenubarShortcut = ({
                                    className,
  ...props
}) => {
  return (
                                (<span
                                    className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
                                    {...props} />)
                                );
}
                                MenubarShortcut.displayname = "MenubarShortcut"

                                export {
                                    Menubar,
                                    MenubarMenu,
                                    MenubarTrigger,
                                    MenubarContent,
                                    MenubarItem,
                                    MenubarSeparator,
                                    MenubarLabel,
                                    MenubarCheckboxItem,
                                    MenubarRadioGroup,
                                    MenubarRadioItem,
                                    MenubarPortal,
                                    MenubarSubContent,
                                    MenubarSubTrigger,
                                    MenubarGroup,
                                    MenubarSub,
                                    MenubarShortcut,
}
                                import * as React from "react"
                                import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu"
                                import {cva} from "class-variance-authority"
                                import {ChevronDown} from "lucide-react"

                                import {cn} from "@/lib/utils"

                                const NavigationMenu = React.forwardRef(({className, children, ...props }, ref) => (
                                <NavigationMenuPrimitive.Root
                                    ref={ref}
                                    className={cn(
                                        "relative z-10 flex max-w-max flex-1 items-center justify-center",
                                        className
                                    )}
                                    {...props}>
                                    {children}
                                    <NavigationMenuViewport />
                                </NavigationMenuPrimitive.Root>
                                ))
                                NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName

                                const NavigationMenuList = React.forwardRef(({className, ...props }, ref) => (
                                <NavigationMenuPrimitive.List
                                    ref={ref}
                                    className={cn(
                                        "group flex flex-1 list-none items-center justify-center space-x-1",
                                        className
                                    )}
                                    {...props} />
                                ))
                                NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName

                                const NavigationMenuItem = NavigationMenuPrimitive.Item

                                const navigationMenuTriggerStyle = cva(
                                "group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
                                )

                                const NavigationMenuTrigger = React.forwardRef(({className, children, ...props }, ref) => (
                                <NavigationMenuPrimitive.Trigger
                                    ref={ref}
                                    className={cn(navigationMenuTriggerStyle(), "group", className)}
                                    {...props}>
                                    {children}{" "}
                                    <ChevronDown
                                        className="relative top-[1px] ml-1 h-3 w-3 transition duration-300 group-data-[state=open]:rotate-180"
                                        aria-hidden="true" />
                                </NavigationMenuPrimitive.Trigger>
                                ))
                                NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName

                                const NavigationMenuContent = React.forwardRef(({className, ...props }, ref) => (
                                <NavigationMenuPrimitive.Content
                                    ref={ref}
                                    className={cn(
                                        "left-0 top-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 md:absolute md:w-auto ",
                                        className
                                    )}
                                    {...props} />
                                ))
                                NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName

                                const NavigationMenuLink = NavigationMenuPrimitive.Link

                                const NavigationMenuViewport = React.forwardRef(({className, ...props }, ref) => (
                                <div className={cn("absolute left-0 top-full flex justify-center")}>
                                    <NavigationMenuPrimitive.Viewport
                                        className={cn(
                                            "origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 md:w-[var(--radix-navigation-menu-viewport-width)]",
                                            className
                                        )}
                                        ref={ref}
                                        {...props} />
                                </div>
                                ))
                                NavigationMenuViewport.displayName =
                                NavigationMenuPrimitive.Viewport.displayName

                                const NavigationMenuIndicator = React.forwardRef(({className, ...props }, ref) => (
                                <NavigationMenuPrimitive.Indicator
                                    ref={ref}
                                    className={cn(
                                        "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in",
                                        className
                                    )}
                                    {...props}>
                                    <div
                                        className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
                                </NavigationMenuPrimitive.Indicator>
                                ))
                                NavigationMenuIndicator.displayName =
                                NavigationMenuPrimitive.Indicator.displayName

                                export {
                                    navigationMenuTriggerStyle,
                                    NavigationMenu,
                                    NavigationMenuList,
                                    NavigationMenuItem,
                                    NavigationMenuContent,
                                    NavigationMenuTrigger,
                                    NavigationMenuLink,
                                    NavigationMenuIndicator,
                                    NavigationMenuViewport,
}
                                import * as React from "react"
                                import {ChevronLeft, ChevronRight, MoreHorizontal} from "lucide-react"

                                import {cn} from "@/lib/utils"
                                import {buttonVariants} from "@/components/ui/button";

                                const Pagination = ({
                                    className,
  ...props
}) => (
                                <nav
                                    role="navigation"
                                    aria-label="pagination"
                                    className={cn("mx-auto flex w-full justify-center", className)}
                                    {...props} />
                                )
                                Pagination.displayName = "Pagination"

                                const PaginationContent = React.forwardRef(({className, ...props }, ref) => (
                                <ul
                                    ref={ref}
                                    className={cn("flex flex-row items-center gap-1", className)}
                                    {...props} />
                                ))
                                PaginationContent.displayName = "PaginationContent"

                                const PaginationItem = React.forwardRef(({className, ...props }, ref) => (
                                <li ref={ref} className={cn("", className)} {...props} />
                                ))
                                PaginationItem.displayName = "PaginationItem"

                                const PaginationLink = ({
                                    className,
                                    isActive,
                                    size = "icon",
  ...props
}) => (
                                <a
                                    aria-current={isActive ? "page" : undefined}
                                    className={cn(buttonVariants({
                                        variant: isActive ? "outline" : "ghost",
                                        size,
                                    }), className)}
                                    {...props} />
                                )
                                PaginationLink.displayName = "PaginationLink"

                                const PaginationPrevious = ({
                                    className,
  ...props
}) => (
                                <PaginationLink
                                    aria-label="Go to previous page"
                                    size="default"
                                    className={cn("gap-1 pl-2.5", className)}
                                    {...props}>
                                    <ChevronLeft className="h-4 w-4" />
                                    <span>Previous</span>
                                </PaginationLink>
                                )
                                PaginationPrevious.displayName = "PaginationPrevious"

                                const PaginationNext = ({
                                    className,
  ...props
}) => (
                                <PaginationLink
                                    aria-label="Go to next page"
                                    size="default"
                                    className={cn("gap-1 pr-2.5", className)}
                                    {...props}>
                                    <span>Next</span>
                                    <ChevronRight className="h-4 w-4" />
                                </PaginationLink>
                                )
                                PaginationNext.displayName = "PaginationNext"

                                const PaginationEllipsis = ({
                                    className,
  ...props
}) => (
                                <span
                                    aria-hidden
                                    className={cn("flex h-9 w-9 items-center justify-center", className)}
                                    {...props}>
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">More pages</span>
                                </span>
                                )
                                PaginationEllipsis.displayName = "PaginationEllipsis"

                                export {
                                    Pagination,
                                    PaginationContent,
                                    PaginationLink,
                                    PaginationItem,
                                    PaginationPrevious,
                                    PaginationNext,
                                    PaginationEllipsis,
}
                                import * as React from "react"
                                import * as PopoverPrimitive from "@radix-ui/react-popover"

                                import {cn} from "@/lib/utils"

                                const Popover = PopoverPrimitive.Root

                                const PopoverTrigger = PopoverPrimitive.Trigger

                                const PopoverAnchor = PopoverPrimitive.Anchor

                                const PopoverContent = React.forwardRef(({className, align = "center", sideOffset = 4, ...props }, ref) => (
                                <PopoverPrimitive.Portal>
                                    <PopoverPrimitive.Content
                                        ref={ref}
                                        align={align}
                                        sideOffset={sideOffset}
                                        className={cn(
                                            "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                                            className
                                        )}
                                        {...props} />
                                </PopoverPrimitive.Portal>
                                ))
                                PopoverContent.displayName = PopoverPrimitive.Content.displayName

                                export {Popover, PopoverTrigger, PopoverContent, PopoverAnchor}
                                "use client"

                                import * as React from "react"
                                import * as ProgressPrimitive from "@radix-ui/react-progress"

                                import {cn} from "@/lib/utils"

                                const Progress = React.forwardRef(({className, value, ...props }, ref) => (
                                <ProgressPrimitive.Root
                                    ref={ref}
                                    className={cn(
                                        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
                                        className
                                    )}
                                    {...props}>
                                    <ProgressPrimitive.Indicator
                                        className="h-full w-full flex-1 bg-primary transition-all"
                                        style={{ transform: `translateX(-${100 - (value || 0)}%)` }} />
                                </ProgressPrimitive.Root>
                                ))
                                Progress.displayName = ProgressPrimitive.Root.displayName

                                export {Progress}
                                import * as React from "react"
                                import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
                                import {Circle} from "lucide-react"

                                import {cn} from "@/lib/utils"

                                const RadioGroup = React.forwardRef(({className, ...props }, ref) => {
  return (<RadioGroupPrimitive.Root className={cn("grid gap-2", className)} {...props} ref={ref} />);
})
                                RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

                                const RadioGroupItem = React.forwardRef(({className, ...props }, ref) => {
  return (
                                (<RadioGroupPrimitive.Item
                                    ref={ref}
                                    className={cn(
                                        "aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                                        className
                                    )}
                                    {...props}>
                                    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
                                        <Circle className="h-3.5 w-3.5 fill-primary" />
                                    </RadioGroupPrimitive.Indicator>
                                </RadioGroupPrimitive.Item>)
                                );
})
                                RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

                                export {RadioGroup, RadioGroupItem}
                                "use client"

                                import {GripVertical} from "lucide-react"
                                import * as ResizablePrimitive from "react-resizable-panels"

                                import {cn} from "@/lib/utils"

                                const ResizablePanelGroup = ({
                                    className,
  ...props
}) => (
                                <ResizablePrimitive.PanelGroup
                                    className={cn(
                                        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
                                        className
                                    )}
                                    {...props} />
                                )

                                const ResizablePanel = ResizablePrimitive.Panel

                                const ResizableHandle = ({
                                    withHandle,
                                    className,
  ...props
}) => (
                                <ResizablePrimitive.PanelResizeHandle
                                    className={cn(
                                        "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
                                        className
                                    )}
                                    {...props}>
                                    {withHandle && (
                                        <div
                                            className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
                                            <GripVertical className="h-2.5 w-2.5" />
                                        </div>
                                    )}
                                </ResizablePrimitive.PanelResizeHandle>
                                )

                                export {ResizablePanelGroup, ResizablePanel, ResizableHandle}
                                import * as React from "react"
                                import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

                                import {cn} from "@/lib/utils"

                                const ScrollArea = React.forwardRef(({className, children, ...props }, ref) => (
                                <ScrollAreaPrimitive.Root
                                    ref={ref}
                                    className={cn("relative overflow-hidden", className)}
                                    {...props}>
                                    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
                                        {children}
                                    </ScrollAreaPrimitive.Viewport>
                                    <ScrollBar />
                                    <ScrollAreaPrimitive.Corner />
                                </ScrollAreaPrimitive.Root>
                                ))
                                ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

                                const ScrollBar = React.forwardRef(({className, orientation = "vertical", ...props }, ref) => (
                                <ScrollAreaPrimitive.ScrollAreaScrollbar
                                    ref={ref}
                                    orientation={orientation}
                                    className={cn(
                                        "flex touch-none select-none transition-colors",
                                        orientation === "vertical" &&
                                        "h-full w-2.5 border-l border-l-transparent p-[1px]",
                                        orientation === "horizontal" &&
                                        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
                                        className
                                    )}
                                    {...props}>
                                    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
                                </ScrollAreaPrimitive.ScrollAreaScrollbar>
                                ))
                                ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

                                export {ScrollArea, ScrollBar}
                                "use client"

                                import * as React from "react"
                                import * as SelectPrimitive from "@radix-ui/react-select"
                                import {Check, ChevronDown, ChevronUp} from "lucide-react"

                                import {cn} from "@/lib/utils"

                                const Select = SelectPrimitive.Root

                                const SelectGroup = SelectPrimitive.Group

                                const SelectValue = SelectPrimitive.Value

                                const SelectTrigger = React.forwardRef(({className, children, ...props }, ref) => (
                                <SelectPrimitive.Trigger
                                    ref={ref}
                                    className={cn(
                                        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
                                        className
                                    )}
                                    {...props}>
                                    {children}
                                    <SelectPrimitive.Icon asChild>
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </SelectPrimitive.Icon>
                                </SelectPrimitive.Trigger>
                                ))
                                SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

                                const SelectScrollUpButton = React.forwardRef(({className, ...props }, ref) => (
                                <SelectPrimitive.ScrollUpButton
                                    ref={ref}
                                    className={cn("flex cursor-default items-center justify-center py-1", className)}
                                    {...props}>
                                    <ChevronUp className="h-4 w-4" />
                                </SelectPrimitive.ScrollUpButton>
                                ))
                                SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

                                const SelectScrollDownButton = React.forwardRef(({className, ...props }, ref) => (
                                <SelectPrimitive.ScrollDownButton
                                    ref={ref}
                                    className={cn("flex cursor-default items-center justify-center py-1", className)}
                                    {...props}>
                                    <ChevronDown className="h-4 w-4" />
                                </SelectPrimitive.ScrollDownButton>
                                ))
                                SelectScrollDownButton.displayName =
                                SelectPrimitive.ScrollDownButton.displayName

                                const SelectContent = React.forwardRef(({className, children, position = "popper", ...props }, ref) => (
                                <SelectPrimitive.Portal>
                                    <SelectPrimitive.Content
                                        ref={ref}
                                        className={cn(
                                            "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                                            position === "popper" &&
                                            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
                                            className
                                        )}
                                        position={position}
                                        {...props}>
                                        <SelectScrollUpButton />
                                        <SelectPrimitive.Viewport
                                            className={cn("p-1", position === "popper" &&
                                                "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>
                                            {children}
                                        </SelectPrimitive.Viewport>
                                        <SelectScrollDownButton />
                                    </SelectPrimitive.Content>
                                </SelectPrimitive.Portal>
                                ))
                                SelectContent.displayName = SelectPrimitive.Content.displayName

                                const SelectLabel = React.forwardRef(({className, ...props }, ref) => (
                                <SelectPrimitive.Label
                                    ref={ref}
                                    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
                                    {...props} />
                                ))
                                SelectLabel.displayName = SelectPrimitive.Label.displayName

                                const SelectItem = React.forwardRef(({className, children, ...props }, ref) => (
                                <SelectPrimitive.Item
                                    ref={ref}
                                    className={cn(
                                        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                        className
                                    )}
                                    {...props}>
                                    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                                        <SelectPrimitive.ItemIndicator>
                                            <Check className="h-4 w-4" />
                                        </SelectPrimitive.ItemIndicator>
                                    </span>
                                    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
                                </SelectPrimitive.Item>
                                ))
                                SelectItem.displayName = SelectPrimitive.Item.displayName

                                const SelectSeparator = React.forwardRef(({className, ...props }, ref) => (
                                <SelectPrimitive.Separator
                                    ref={ref}
                                    className={cn("-mx-1 my-1 h-px bg-muted", className)}
                                    {...props} />
                                ))
                                SelectSeparator.displayName = SelectPrimitive.Separator.displayName

                                export {
                                    Select,
                                    SelectGroup,
                                    SelectValue,
                                    SelectTrigger,
                                    SelectContent,
                                    SelectLabel,
                                    SelectItem,
                                    SelectSeparator,
                                    SelectScrollUpButton,
                                    SelectScrollDownButton,
}
                                import * as React from "react"
                                import * as SeparatorPrimitive from "@radix-ui/react-separator"

                                import {cn} from "@/lib/utils"

                                const Separator = React.forwardRef((
                                {className, orientation = "horizontal", decorative = true, ...props },
                                ref
) => (
                                <SeparatorPrimitive.Root
                                    ref={ref}
                                    decorative={decorative}
                                    orientation={orientation}
                                    className={cn(
                                        "shrink-0 bg-border",
                                        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
                                        className
                                    )}
                                    {...props} />
                                ))
                                Separator.displayName = SeparatorPrimitive.Root.displayName

                                export {Separator}
                                "use client";
                                import * as React from "react"
                                import * as SheetPrimitive from "@radix-ui/react-dialog"
                                import {cva} from "class-variance-authority";
                                import {X} from "lucide-react"

                                import {cn} from "@/lib/utils"

                                const Sheet = SheetPrimitive.Root

                                const SheetTrigger = SheetPrimitive.Trigger

                                const SheetClose = SheetPrimitive.Close

                                const SheetPortal = SheetPrimitive.Portal

                                const SheetOverlay = React.forwardRef(({className, ...props }, ref) => (
                                <SheetPrimitive.Overlay
                                    className={cn(
                                        "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                                        className
                                    )}
                                    {...props}
                                    ref={ref} />
                                ))
                                SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

                                const sheetVariants = cva(
                                "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
                                {
                                    variants: {
                                    side: {
                                    top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
                                bottom:
                                "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
                                left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
                                right:
                                "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
                                defaultVariants: {
                                    side: "right",
    },
  }
                                )

                                const SheetContent = React.forwardRef(({side = "right", className, children, ...props }, ref) => (
                                <SheetPortal>
                                    <SheetOverlay />
                                    <SheetPrimitive.Content ref={ref} className={cn(sheetVariants({ side }), className)} {...props}>
                                        <SheetPrimitive.Close
                                            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
                                            <X className="h-4 w-4" />
                                            <span className="sr-only">Close</span>
                                        </SheetPrimitive.Close>
                                        {children}
                                    </SheetPrimitive.Content>
                                </SheetPortal>
                                ))
                                SheetContent.displayName = SheetPrimitive.Content.displayName

                                const SheetHeader = ({
                                    className,
  ...props
}) => (
                                <div
                                    className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
                                    {...props} />
                                )
                                SheetHeader.displayName = "SheetHeader"

                                const SheetFooter = ({
                                    className,
  ...props
}) => (
                                <div
                                    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
                                    {...props} />
                                )
                                SheetFooter.displayName = "SheetFooter"

                                const SheetTitle = React.forwardRef(({className, ...props }, ref) => (
                                <SheetPrimitive.Title
                                    ref={ref}
                                    className={cn("text-lg font-semibold text-foreground", className)}
                                    {...props} />
                                ))
                                SheetTitle.displayName = SheetPrimitive.Title.displayName

                                const SheetDescription = React.forwardRef(({className, ...props }, ref) => (
                                <SheetPrimitive.Description
                                    ref={ref}
                                    className={cn("text-sm text-muted-foreground", className)}
                                    {...props} />
                                ))
                                SheetDescription.displayName = SheetPrimitive.Description.displayName

                                export {
                                    Sheet,
                                    SheetPortal,
                                    SheetOverlay,
                                    SheetTrigger,
                                    SheetClose,
                                    SheetContent,
                                    SheetHeader,
                                    SheetFooter,
                                    SheetTitle,
                                    SheetDescription,
}
                                import * as React from "react"
                                import {Slot} from "@radix-ui/react-slot"
                                import {cva} from "class-variance-authority";
                                import {PanelLeft} from "lucide-react"

                                import {useIsMobile} from "@/hooks/use-mobile"
                                import {cn} from "@/lib/utils"
                                import {Button} from "@/components/ui/button"
                                import {Input} from "@/components/ui/input"
                                import {Separator} from "@/components/ui/separator"
                                import {Sheet, SheetContent} from "@/components/ui/sheet"
                                import {Skeleton} from "@/components/ui/skeleton"
                                import {
                                    Tooltip,
                                    TooltipContent,
                                    TooltipProvider,
                                    TooltipTrigger,
} from "@/components/ui/tooltip"

                                const SIDEBAR_COOKIE_NAME = "sidebar_state"
                                const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
                                const SIDEBAR_WIDTH = "16rem"
                                const SIDEBAR_WIDTH_MOBILE = "18rem"
                                const SIDEBAR_WIDTH_ICON = "3rem"
                                const SIDEBAR_KEYBOARD_SHORTCUT = "b"

                                const SidebarContext = React.createContext(null)

                                function useSidebar() {
  const context = React.useContext(SidebarContext)
                                if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

                                return context
}

                                const SidebarProvider = React.forwardRef((
                                {
                                    defaultOpen = true,
                                    open: openProp,
                                onOpenChange: setOpenProp,
                                className,
                                style,
                                children,
                                ...props
  },
                                ref
) => {
  const isMobile = useIsMobile()
                                const [openMobile, setOpenMobile] = React.useState(false)

                                // This is the internal state of the sidebar.
                                // We use openProp and setOpenProp for control from outside the component.
                                const [_open, _setOpen] = React.useState(defaultOpen)
                                const open = openProp ?? _open
  const setOpen = React.useCallback((value) => {
    const openState = typeof value === "function" ? value(open) : value
                                if (setOpenProp) {
                                    setOpenProp(openState)
                                } else {
                                    _setOpen(openState)
                                }

    // This sets the cookie to keep the sidebar state.
                                document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
  }, [setOpenProp, open])

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    return isMobile
      ? setOpenMobile((open) => !open)
      : setOpen((open) => !open);
  }, [isMobile, setOpen, setOpenMobile])

  // Adds a keyboard shortcut to toggle the sidebar.
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (
                                event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
                                (event.metaKey || event.ctrlKey)
                                ) {
                                    event.preventDefault()
        toggleSidebar()
      }
    }

                                window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar])

                                // We add a state so that we can do data-state="expanded" or "collapsed".
                                // This makes it easier to style the sidebar with Tailwind classes.
                                const state = open ? "expanded" : "collapsed"

  const contextValue = React.useMemo(() => ({
                                    state,
                                    open,
                                    setOpen,
                                    isMobile,
                                    openMobile,
                                    setOpenMobile,
                                    toggleSidebar,
  }), [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar])

                                return (
                                (<SidebarContext.Provider value={contextValue}>
                                    <TooltipProvider delayDuration={0}>
                                        <div
                                            style={
                                                {
                                                    "--sidebar-width": SIDEBAR_WIDTH,
                                                    "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                                                    ...style
                                                }
                                            }
                                            className={cn(
                                                "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
                                                className
                                            )}
                                            ref={ref}
                                            {...props}>
                                            {children}
                                        </div>
                                    </TooltipProvider>
                                </SidebarContext.Provider>)
                                );
})
                                SidebarProvider.displayName = "SidebarProvider"

                                const Sidebar = React.forwardRef((
                                {
                                    side = "left",
                                    variant = "sidebar",
                                    collapsible = "offcanvas",
                                    className,
                                    children,
    ...props
  },
                                ref
) => {
  const {isMobile, state, openMobile, setOpenMobile} = useSidebar()

                                if (collapsible === "none") {
    return (
                                (<div
                                    className={cn(
                                        "flex h-full w-[--sidebar-width] flex-col bg-sidebar text-sidebar-foreground",
                                        className
                                    )}
                                    ref={ref}
                                    {...props}>
                                    {children}
                                </div>)
                                );
  }

                                if (isMobile) {
    return (
                                (<Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
                                    <SheetContent
                                        data-sidebar="sidebar"
                                        data-mobile="true"
                                        className="w-[--sidebar-width] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
                                        style={
                                            {
                                                "--sidebar-width": SIDEBAR_WIDTH_MOBILE
                                            }
                                        }
                                        side={side}>
                                        <div className="flex h-full w-full flex-col">{children}</div>
                                    </SheetContent>
                                </Sheet>)
                                );
  }

                                return (
                                (<div
                                    ref={ref}
                                    className="group peer hidden text-sidebar-foreground md:block"
                                    data-state={state}
                                    data-collapsible={state === "collapsed" ? collapsible : ""}
                                    data-variant={variant}
                                    data-side={side}>
                                    {/* This is what handles the sidebar gap on desktop */}
                                    <div
                                        className={cn(
                                            "relative h-svh w-[--sidebar-width] bg-transparent transition-[width] duration-200 ease-linear",
                                            "group-data-[collapsible=offcanvas]:w-0",
                                            "group-data-[side=right]:rotate-180",
                                            variant === "floating" || variant === "inset"
                                                ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]"
                                                : "group-data-[collapsible=icon]:w-[--sidebar-width-icon]"
                                        )} />
                                    <div
                                        className={cn(
                                            "fixed inset-y-0 z-10 hidden h-svh w-[--sidebar-width] transition-[left,right,width] duration-200 ease-linear md:flex",
                                            side === "left"
                                                ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
                                                : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
                                            // Adjust the padding for floating and inset variants.
                                            variant === "floating" || variant === "inset"
                                                ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]"
                                                : "group-data-[collapsible=icon]:w-[--sidebar-width-icon] group-data-[side=left]:border-r group-data-[side=right]:border-l",
                                            className
                                        )}
                                        {...props}>
                                        <div
                                            data-sidebar="sidebar"
                                            className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow">
                                            {children}
                                        </div>
                                    </div>
                                </div>)
                                );
})
                                Sidebar.displayName = "Sidebar"

                                const SidebarTrigger = React.forwardRef(({className, onClick, asChild = false, ...props }, ref) => {
  const {toggleSidebar} = useSidebar()

                                return (
                                (<Button
                                    ref={ref}
                                    data-sidebar="trigger"
                                    variant="ghost"
                                    size="icon"
                                    className={cn("h-7 w-7", className)}
                                    onClick={(event) => {
                                        onClick?.(event)
                                        toggleSidebar()
                                    }}
                                    asChild={asChild}
                                    {...props}>
                                    {asChild ? (
                                        <PanelLeft />
                                    ) : (
                                        <>
                                            <PanelLeft />
                                            <span className="sr-only">Toggle Sidebar</span>
                                        </>
                                    )}
                                </Button>)
                                );
})
                                SidebarTrigger.displayName = "SidebarTrigger"

                                const SidebarRail = React.forwardRef(({className, ...props }, ref) => {
  const {toggleSidebar} = useSidebar()

                                return (
                                (<button
                                    ref={ref}
                                    data-sidebar="rail"
                                    aria-label="Toggle Sidebar"
                                    tabIndex={-1}
                                    onClick={toggleSidebar}
                                    title="Toggle Sidebar"
                                    className={cn(
                                        "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
                                        "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
                                        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
                                        "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar",
                                        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
                                        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
                                        className
                                    )}
                                    {...props} />)
                                );
})
                                SidebarRail.displayName = "SidebarRail"

                                const SidebarInset = React.forwardRef(({className, ...props }, ref) => {
  return (
                                (<main
                                    ref={ref}
                                    className={cn(
                                        "relative flex min-h-svh flex-1 flex-col bg-background",
                                        "peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
                                        className
                                    )}
                                    {...props} />)
                                );
})
                                SidebarInset.displayName = "SidebarInset"

                                const SidebarInput = React.forwardRef(({className, ...props }, ref) => {
  return (
                                (<Input
                                    ref={ref}
                                    data-sidebar="input"
                                    className={cn(
                                        "h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                                        className
                                    )}
                                    {...props} />)
                                );
})
                                SidebarInput.displayName = "SidebarInput"

                                const SidebarHeader = React.forwardRef(({className, ...props }, ref) => {
  return (
                                (<div
                                    ref={ref}
                                    data-sidebar="header"
                                    className={cn("flex flex-col gap-2 p-2", className)}
                                    {...props} />)
                                );
})
                                SidebarHeader.displayName = "SidebarHeader"

                                const SidebarFooter = React.forwardRef(({className, ...props }, ref) => {
  return (
                                (<div
                                    ref={ref}
                                    data-sidebar="footer"
                                    className={cn("flex flex-col gap-2 p-2", className)}
                                    {...props} />)
                                );
})
                                SidebarFooter.displayName = "SidebarFooter"

                                const SidebarSeparator = React.forwardRef(({className, ...props }, ref) => {
  return (
                                (<Separator
                                    ref={ref}
                                    data-sidebar="separator"
                                    className={cn("mx-2 w-auto bg-sidebar-border", className)}
                                    {...props} />)
                                );
})
                                SidebarSeparator.displayName = "SidebarSeparator"

                                const SidebarContent = React.forwardRef(({className, ...props }, ref) => {
  return (
                                (<div
                                    ref={ref}
                                    data-sidebar="content"
                                    className={cn(
                                        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
                                        className
                                    )}
                                    {...props} />)
                                );
})
                                SidebarContent.displayName = "SidebarContent"

                                const SidebarGroup = React.forwardRef(({className, ...props }, ref) => {
  return (
                                (<div
                                    ref={ref}
                                    data-sidebar="group"
                                    className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
                                    {...props} />)
                                );
})
                                SidebarGroup.displayName = "SidebarGroup"

                                const SidebarGroupLabel = React.forwardRef(({className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "div"

                                return (
                                (<Comp
                                    ref={ref}
                                    data-sidebar="group-label"
                                    className={cn(
                                        "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
                                        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
                                        className
                                    )}
                                    {...props} />)
                                );
})
                                SidebarGroupLabel.displayName = "SidebarGroupLabel"

                                const SidebarGroupAction = React.forwardRef(({className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

                                return (
                                (<Comp
                                    ref={ref}
                                    data-sidebar="group-action"
                                    className={cn(
                                        "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
                                        // Increases the hit area of the button on mobile.
                                        "after:absolute after:-inset-2 after:md:hidden",
                                        "group-data-[collapsible=icon]:hidden",
                                        className
                                    )}
                                    {...props} />)
                                );
})
                                SidebarGroupAction.displayName = "SidebarGroupAction"

                                const SidebarGroupContent = React.forwardRef(({className, ...props }, ref) => (
                                <div
                                    ref={ref}
                                    data-sidebar="group-content"
                                    className={cn("w-full text-sm", className)}
                                    {...props} />
                                ))
                                SidebarGroupContent.displayName = "SidebarGroupContent"

                                const SidebarMenu = React.forwardRef(({className, ...props }, ref) => (
                                <ul
                                    ref={ref}
                                    data-sidebar="menu"
                                    className={cn("flex w-full min-w-0 flex-col gap-1", className)}
                                    {...props} />
                                ))
                                SidebarMenu.displayName = "SidebarMenu"

                                const SidebarMenuItem = React.forwardRef(({className, ...props }, ref) => (
                                <li
                                    ref={ref}
                                    data-sidebar="menu-item"
                                    className={cn("group/menu-item relative", className)}
                                    {...props} />
                                ))
                                SidebarMenuItem.displayName = "SidebarMenuItem"

                                const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
                                {
                                    variants: {
                                    variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                outline:
                                "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
                                size: {
        default: "h-8 text-sm",
                                sm: "h-7 text-xs",
                                lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0",
      },
    },
                                defaultVariants: {
                                    variant: "default",
                                size: "default",
    },
  }
                                )

                                const SidebarMenuButton = React.forwardRef((
                                {
                                    asChild = false,
                                    isActive = false,
                                    variant = "default",
                                    size = "default",
                                    tooltip,
                                    className,
    ...props
  },
                                ref
) => {
  const Comp = asChild ? Slot : "button"
                                const {isMobile, state} = useSidebar()

                                const button = (
                                <Comp
                                    ref={ref}
                                    data-sidebar="menu-button"
                                    data-size={size}
                                    data-active={isActive}
                                    className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
                                    {...props} />
                                )

                                if (!tooltip) {
    return button
  }

                                if (typeof tooltip === "string") {
                                    tooltip = {
                                        children: tooltip,
                                    }
                                }

                                return (
                                (<Tooltip>
                                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                                    <TooltipContent
                                        side="right"
                                        align="center"
                                        hidden={state !== "collapsed" || isMobile}
                                        {...tooltip} />
                                </Tooltip>)
                                );
})
                                SidebarMenuButton.displayName = "SidebarMenuButton"

                                const SidebarMenuAction = React.forwardRef(({className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

                                return (
                                (<Comp
                                    ref={ref}
                                    data-sidebar="menu-action"
                                    className={cn(
                                        "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
                                        // Increases the hit area of the button on mobile.
                                        "after:absolute after:-inset-2 after:md:hidden",
                                        "peer-data-[size=sm]/menu-button:top-1",
                                        "peer-data-[size=default]/menu-button:top-1.5",
                                        "peer-data-[size=lg]/menu-button:top-2.5",
                                        "group-data-[collapsible=icon]:hidden",
                                        showOnHover &&
                                        "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
                                        className
                                    )}
                                    {...props} />)
                                );
})
                                SidebarMenuAction.displayName = "SidebarMenuAction"

                                const SidebarMenuBadge = React.forwardRef(({className, ...props }, ref) => (
                                <div
                                    ref={ref}
                                    data-sidebar="menu-badge"
                                    className={cn(
                                        "pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground",
                                        "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
                                        "peer-data-[size=sm]/menu-button:top-1",
                                        "peer-data-[size=default]/menu-button:top-1.5",
                                        "peer-data-[size=lg]/menu-button:top-2.5",
                                        "group-data-[collapsible=icon]:hidden",
                                        className
                                    )}
                                    {...props} />
                                ))
                                SidebarMenuBadge.displayName = "SidebarMenuBadge"

                                const SidebarMenuSkeleton = React.forwardRef(({className, showIcon = false, ...props }, ref) => {
  // Random width between 50 to 90%.
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  }, [])

                                return (
                                (<div
                                    ref={ref}
                                    data-sidebar="menu-skeleton"
                                    className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
                                    {...props}>
                                    {showIcon && (
                                        <Skeleton className="size-4 rounded-md" data-sidebar="menu-skeleton-icon" />
                                    )}
                                    <Skeleton
                                        className="h-4 max-w-[--skeleton-width] flex-1"
                                        data-sidebar="menu-skeleton-text"
                                        style={
                                            {
                                                "--skeleton-width": width
                                            }
                                        } />
                                </div>)
                                );
})
                                SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"

                                const SidebarMenuSub = React.forwardRef(({className, ...props }, ref) => (
                                <ul
                                    ref={ref}
                                    data-sidebar="menu-sub"
                                    className={cn(
                                        "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
                                        "group-data-[collapsible=icon]:hidden",
                                        className
                                    )}
                                    {...props} />
                                ))
                                SidebarMenuSub.displayName = "SidebarMenuSub"

                                const SidebarMenuSubItem = React.forwardRef(({...props}, ref) => <li ref={ref} {...props} />)
                                SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

                                const SidebarMenuSubButton = React.forwardRef(
                                ({asChild = false, size = "md", isActive, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "a"

                                return (
                                (<Comp
                                    ref={ref}
                                    data-sidebar="menu-sub-button"
                                    data-size={size}
                                    data-active={isActive}
                                    className={cn(
                                        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
                                        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
                                        size === "sm" && "text-xs",
                                        size === "md" && "text-sm",
                                        "group-data-[collapsible=icon]:hidden",
                                        className
                                    )}
                                    {...props} />)
                                );
  }
                                )
                                SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

                                export {
                                    Sidebar,
                                    SidebarContent,
                                    SidebarFooter,
                                    SidebarGroup,
                                    SidebarGroupAction,
                                    SidebarGroupContent,
                                    SidebarGroupLabel,
                                    SidebarHeader,
                                    SidebarInput,
                                    SidebarInset,
                                    SidebarMenu,
                                    SidebarMenuAction,
                                    SidebarMenuBadge,
                                    SidebarMenuButton,
                                    SidebarMenuItem,
                                    SidebarMenuSkeleton,
                                    SidebarMenuSub,
                                    SidebarMenuSubButton,
                                    SidebarMenuSubItem,
                                    SidebarProvider,
                                    SidebarRail,
                                    SidebarSeparator,
                                    SidebarTrigger,
                                    useSidebar,
}
                                import {cn} from "@/lib/utils"

                                function Skeleton({
                                    className,
  ...props
}) {
  return (
                                (<div
                                    className={cn("animate-pulse rounded-md bg-primary/10", className)}
                                    {...props} />)
                                );
}

                                export {Skeleton}
                                import * as React from "react"
                                import * as SliderPrimitive from "@radix-ui/react-slider"

                                import {cn} from "@/lib/utils"

                                const Slider = React.forwardRef(({className, ...props }, ref) => (
                                <SliderPrimitive.Root
                                    ref={ref}
                                    className={cn("relative flex w-full touch-none select-none items-center", className)}
                                    {...props}>
                                    <SliderPrimitive.Track
                                        className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
                                        <SliderPrimitive.Range className="absolute h-full bg-primary" />
                                    </SliderPrimitive.Track>
                                    <SliderPrimitive.Thumb
                                        className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
                                </SliderPrimitive.Root>
                                ))
                                Slider.displayName = SliderPrimitive.Root.displayName

                                export {Slider}
                                "use client";
                                import {useTheme} from "next-themes"
                                import {Toaster as Sonner} from "sonner"

                                const Toaster = ({
                                    ...props
                                }) => {
  const {theme = "system"} = useTheme()

                                return (
                                (<Sonner
                                    theme={theme}
                                    className="toaster group"
                                    toastOptions={{
                                        classNames: {
                                            toast:
                                                "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
                                            description: "group-[.toast]:text-muted-foreground",
                                            actionButton:
                                                "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                                            cancelButton:
                                                "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                                        },
                                    }}
                                    {...props} />)
                                );
}

                                export {Toaster}
                                import * as React from "react"
                                import * as SwitchPrimitives from "@radix-ui/react-switch"

                                import {cn} from "@/lib/utils"

                                const Switch = React.forwardRef(({className, ...props }, ref) => (
                                <SwitchPrimitives.Root
                                    className={cn(
                                        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
                                        className
                                    )}
                                    {...props}
                                    ref={ref}>
                                    <SwitchPrimitives.Thumb
                                        className={cn(
                                            "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
                                        )} />
                                </SwitchPrimitives.Root>
                                ))
                                Switch.displayName = SwitchPrimitives.Root.displayName

                                export {Switch}
                                import * as React from "react"

                                import {cn} from "@/lib/utils"

                                const Table = React.forwardRef(({className, ...props }, ref) => (
                                <div className="relative w-full overflow-auto">
                                    <table
                                        ref={ref}
                                        className={cn("w-full caption-bottom text-sm", className)}
                                        {...props} />
                                </div>
                                ))
                                Table.displayName = "Table"

                                const TableHeader = React.forwardRef(({className, ...props }, ref) => (
                                <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
                                ))
                                TableHeader.displayName = "TableHeader"

                                const TableBody = React.forwardRef(({className, ...props }, ref) => (
                                <tbody
                                    ref={ref}
                                    className={cn("[&_tr:last-child]:border-0", className)}
                                    {...props} />
                                ))
                                TableBody.displayName = "TableBody"

                                const TableFooter = React.forwardRef(({className, ...props }, ref) => (
                                <tfoot
                                    ref={ref}
                                    className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
                                    {...props} />
                                ))
                                TableFooter.displayName = "TableFooter"

                                const TableRow = React.forwardRef(({className, ...props }, ref) => (
                                <tr
                                    ref={ref}
                                    className={cn(
                                        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
                                        className
                                    )}
                                    {...props} />
                                ))
                                TableRow.displayName = "TableRow"

                                const TableHead = React.forwardRef(({className, ...props }, ref) => (
                                <th
                                    ref={ref}
                                    className={cn(
                                        "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
                                        className
                                    )}
                                    {...props} />
                                ))
                                TableHead.displayName = "TableHead"

                                const TableCell = React.forwardRef(({className, ...props }, ref) => (
                                <td
                                    ref={ref}
                                    className={cn(
                                        "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
                                        className
                                    )}
                                    {...props} />
                                ))
                                TableCell.displayName = "TableCell"

                                const TableCaption = React.forwardRef(({className, ...props }, ref) => (
                                <caption
                                    ref={ref}
                                    className={cn("mt-4 text-sm text-muted-foreground", className)}
                                    {...props} />
                                ))
                                TableCaption.displayName = "TableCaption"

                                export {
                                    Table,
                                    TableHeader,
                                    TableBody,
                                    TableFooter,
                                    TableHead,
                                    TableRow,
                                    TableCell,
                                    TableCaption,
}
                                import * as React from "react"
                                import * as TabsPrimitive from "@radix-ui/react-tabs"

                                import {cn} from "@/lib/utils"

                                const Tabs = TabsPrimitive.Root

                                const TabsList = React.forwardRef(({className, ...props }, ref) => (
                                <TabsPrimitive.List
                                    ref={ref}
                                    className={cn(
                                        "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
                                        className
                                    )}
                                    {...props} />
                                ))
                                TabsList.displayName = TabsPrimitive.List.displayName

                                const TabsTrigger = React.forwardRef(({className, ...props }, ref) => (
                                <TabsPrimitive.Trigger
                                    ref={ref}
                                    className={cn(
                                        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
                                        className
                                    )}
                                    {...props} />
                                ))
                                TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

                                const TabsContent = React.forwardRef(({className, ...props }, ref) => (
                                <TabsPrimitive.Content
                                    ref={ref}
                                    className={cn(
                                        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                        className
                                    )}
                                    {...props} />
                                ))
                                TabsContent.displayName = TabsPrimitive.Content.displayName

                                export {Tabs, TabsList, TabsTrigger, TabsContent}
                                import * as React from "react"

                                import {cn} from "@/lib/utils"

                                const Textarea = React.forwardRef(({className, ...props }, ref) => {
  return (
                                (<textarea
                                    className={cn(
                                        "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                                        className
                                    )}
                                    ref={ref}
                                    {...props} />)
                                );
})
                                Textarea.displayName = "Textarea"

                                export {Textarea}
                                import * as React from "react";
                                import {cva} from "class-variance-authority";
                                import {X} from "lucide-react";
                                import {cn} from "@/lib/utils";

                                const ToastProvider = React.forwardRef(({...props}, ref) => (
                                <div
                                    ref={ref}
                                    className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
                                    {...props}
                                />
                                ));
                                ToastProvider.displayName = "ToastProvider";

                                const ToastViewport = React.forwardRef(({...props}, ref) => (
                                <div
                                    ref={ref}
                                    className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
                                    {...props}
                                />
                                ));
                                ToastViewport.displayName = "ToastViewport";

                                const toastVariants = cva(
                                "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
                                {
                                    variants: {
                                    variant: {
        default: "border bg-background text-foreground",
                                destructive:
                                "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
                                defaultVariants: {
                                    variant: "default",
    },
  }
                                );

                                const Toast = React.forwardRef(({className, variant, ...props }, ref) => {
  return (
                                <div
                                    ref={ref}
                                    className={cn(toastVariants({ variant }), className)}
                                    {...props}
                                />
                                );
});
                                Toast.displayName = "Toast";

                                const ToastAction = React.forwardRef(({className, ...props }, ref) => (
                                <div
                                    ref={ref}
                                    className={cn(
                                        "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
                                        className
                                    )}
                                    {...props}
                                />
                                ));
                                ToastAction.displayName = "ToastAction";

                                const ToastClose = React.forwardRef(({className, ...props }, ref) => (
                                <button
                                    ref={ref}
                                    className={cn(
                                        "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
                                        className
                                    )}
                                    toast-close=""
                                    {...props}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                                ));
                                ToastClose.displayName = "ToastClose";

                                const ToastTitle = React.forwardRef(({className, ...props }, ref) => (
                                <div
                                    ref={ref}
                                    className={cn("text-sm font-semibold", className)}
                                    {...props}
                                />
                                ));
                                ToastTitle.displayName = "ToastTitle";

                                const ToastDescription = React.forwardRef(({className, ...props }, ref) => (
                                <div
                                    ref={ref}
                                    className={cn("text-sm opacity-90", className)}
                                    {...props}
                                />
                                ));
                                ToastDescription.displayName = "ToastDescription";

                                export {
                                    ToastProvider,
                                    ToastViewport,
                                    Toast,
                                    ToastTitle,
                                    ToastDescription,
                                    ToastClose,
                                    ToastAction,
};
                                import {useToast} from "@/components/ui/use-toast";
                                import {
                                    Toast,
                                    ToastClose,
                                    ToastDescription,
                                    ToastProvider,
                                    ToastTitle,
                                    ToastViewport,
} from "@/components/ui/toast";

                                export function Toaster() {
  const {toasts} = useToast();

                                return (
                                <ToastProvider>
                                    {toasts.map(function ({ id, title, description, action, ...props }) {
                                        return (
                                            <Toast key={id} {...props}>
                                                <div className="grid gap-1">
                                                    {title && <ToastTitle>{title}</ToastTitle>}
                                                    {description && (
                                                        <ToastDescription>{description}</ToastDescription>
                                                    )}
                                                </div>
                                                {action}
                                                <ToastClose />
                                            </Toast>
                                        );
                                    })}
                                    <ToastViewport />
                                </ToastProvider>
                                );
}
                                "use client";
                                import * as React from "react"
                                import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"

                                import {cn} from "@/lib/utils"
                                import {toggleVariants} from "@/components/ui/toggle"

                                const ToggleGroupContext = React.createContext({
                                    size: "default",
                                variant: "default",
})

                                const ToggleGroup = React.forwardRef(({className, variant, size, children, ...props }, ref) => (
                                <ToggleGroupPrimitive.Root
                                    ref={ref}
                                    className={cn("flex items-center justify-center gap-1", className)}
                                    {...props}>
                                    <ToggleGroupContext.Provider value={{ variant, size }}>
                                        {children}
                                    </ToggleGroupContext.Provider>
                                </ToggleGroupPrimitive.Root>
                                ))

                                ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName

                                const ToggleGroupItem = React.forwardRef(({className, children, variant, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext)

                                return (
                                (<ToggleGroupPrimitive.Item
                                    ref={ref}
                                    className={cn(toggleVariants({
                                        variant: context.variant || variant,
                                        size: context.size || size,
                                    }), className)}
                                    {...props}>
                                    {children}
                                </ToggleGroupPrimitive.Item>)
                                );
})

                                ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName

                                export {ToggleGroup, ToggleGroupItem}
                                import * as React from "react"
                                import * as TogglePrimitive from "@radix-ui/react-toggle"
                                import {cva} from "class-variance-authority";

                                import {cn} from "@/lib/utils"

                                const toggleVariants = cva(
                                "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
                                {
                                    variants: {
                                    variant: {
        default: "bg-transparent",
                                outline:
                                "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
      },
                                size: {
        default: "h-9 px-2 min-w-9",
                                sm: "h-8 px-1.5 min-w-8",
                                lg: "h-10 px-2.5 min-w-10",
      },
    },
                                defaultVariants: {
                                    variant: "default",
                                size: "default",
    },
  }
                                )

                                const Toggle = React.forwardRef(({className, variant, size, ...props }, ref) => (
                                <TogglePrimitive.Root
                                    ref={ref}
                                    className={cn(toggleVariants({ variant, size, className }))}
                                    {...props} />
                                ))

                                Toggle.displayName = TogglePrimitive.Root.displayName

                                export {Toggle, toggleVariants}
                                "use client"

                                import * as React from "react"
                                import * as TooltipPrimitive from "@radix-ui/react-tooltip"

                                import {cn} from "@/lib/utils"

                                const TooltipProvider = TooltipPrimitive.Provider

                                const Tooltip = TooltipPrimitive.Root

                                const TooltipTrigger = TooltipPrimitive.Trigger

                                const TooltipContent = React.forwardRef(({className, sideOffset = 4, ...props }, ref) => (
                                <TooltipPrimitive.Portal>
                                    <TooltipPrimitive.Content
                                        ref={ref}
                                        sideOffset={sideOffset}
                                        className={cn(
                                            "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                                            className
                                        )}
                                        {...props} />
                                </TooltipPrimitive.Portal>
                                ))
                                TooltipContent.displayName = TooltipPrimitive.Content.displayName

                                export {Tooltip, TooltipTrigger, TooltipContent, TooltipProvider}
// Inspired by react-hot-toast library
                                import {useState, useEffect} from "react";

                                const TOAST_LIMIT = 20;
                                const TOAST_REMOVE_DELAY = 1000000;

                                const actionTypes = {
                                    ADD_TOAST: "ADD_TOAST",
                                UPDATE_TOAST: "UPDATE_TOAST",
                                DISMISS_TOAST: "DISMISS_TOAST",
                                REMOVE_TOAST: "REMOVE_TOAST",
};

                                let count = 0;

                                function genId() {
                                    count = (count + 1) % Number.MAX_VALUE;
                                return count.toString();
}

                                const toastTimeouts = new Map();

const addToRemoveQueue = (toastId) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
                                    toastTimeouts.delete(toastId);
                                dispatch({
                                    type: actionTypes.REMOVE_TOAST,
                                toastId,
    });
  }, TOAST_REMOVE_DELAY);

                                toastTimeouts.set(toastId, timeout);
};

const _clearFromRemoveQueue = (toastId) => {
  const timeout = toastTimeouts.get(toastId);
                                if (timeout) {
                                    clearTimeout(timeout);
                                toastTimeouts.delete(toastId);
  }
};

export const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
                                return {
                                    ...state,
                                    toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

                                case actionTypes.UPDATE_TOAST:
                                return {
                                    ...state,
                                    toasts: state.toasts.map((t) =>
                                t.id === action.toast.id ? {...t, ...action.toast } : t
                                ),
      };

                                case actionTypes.DISMISS_TOAST: {
      const {toastId} = action;

                                // ! Side effects ! - This could be extracted into a dismissToast() action,
                                // but I'll keep it here for simplicity
                                if (toastId) {
                                    addToRemoveQueue(toastId);
      } else {
                                    state.toasts.forEach((toast) => {
                                        addToRemoveQueue(toast.id);
                                    });
      }

                                return {
                                    ...state,
                                    toasts: state.toasts.map((t) =>
                                t.id === toastId || toastId === undefined
                                ? {
                                    ...t,
                                    open: false,
              }
                                : t
                                ),
      };
    }
                                case actionTypes.REMOVE_TOAST:
                                if (action.toastId === undefined) {
        return {
                                    ...state,
                                    toasts: [],
        };
      }
                                return {
                                    ...state,
                                    toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

                                const listeners = [];

                                let memoryState = {toasts: [] };

                                function dispatch(action) {
                                    memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
                                    listener(memoryState);
  });
}

                                function toast({...props}) {
  const id = genId();

  const update = (props) =>
                                dispatch({
                                    type: actionTypes.UPDATE_TOAST,
                                toast: {...props, id},
    });

  const dismiss = () =>
                                dispatch({type: actionTypes.DISMISS_TOAST, toastId: id });

                                dispatch({
                                    type: actionTypes.ADD_TOAST,
                                toast: {
                                    ...props,
                                    id,
                                    open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

                                return {
                                    id,
                                    dismiss,
                                    update,
  };
}

                                function useToast() {
  const [state, setState] = useState(memoryState);

  useEffect(() => {
                                    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
                                    listeners.splice(index, 1);
      }
    };
  }, [state]);

                                return {
                                    ...state,
                                    toast,
                                    dismiss: (toastId) => dispatch({type: actionTypes.DISMISS_TOAST, toastId }),
  };
}

                                export {useToast, toast};
                                import React from 'react';

const UserNotRegisteredError = () => {
  return (
                                <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50">
                                    <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-slate-100">
                                        <div className="text-center">
                                            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-orange-100">
                                                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                            </div>
                                            <h1 className="text-3xl font-bold text-slate-900 mb-4">Access Restricted</h1>
                                            <p className="text-slate-600 mb-8">
                                                You are not registered to use this application. Please contact the app administrator to request access.
                                            </p>
                                            <div className="p-4 bg-slate-50 rounded-md text-sm text-slate-600">
                                                <p>If you believe this is an error, you can:</p>
                                                <ul className="list-disc list-inside mt-2 space-y-1">
                                                    <li>Verify you are logged in with the correct account</li>
                                                    <li>Contact the app administrator for access</li>
                                                    <li>Try logging out and back in again</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                );
};

                                export default UserNotRegisteredError;
                                import * as React from "react"

                                const MOBILE_BREAKPOINT = 768

                                export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
                                    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
                                }
                                mql.addEventListener("change", onChange)
                                setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange);
  }, [])

                                return !!isMobile
}
                                const isNode = typeof window === 'undefined';
                                const windowObj = isNode ? {localStorage: new Map() } : window;
                                const storage = windowObj.localStorage;

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

                                const getAppParamValue = (paramName, {defaultValue = undefined, removeFromUrl = false} = { }) => {
	if (isNode) {
		return defaultValue;
	}
                                const storageKey = `base44_${toSnakeCase(paramName)}`;
                                const urlParams = new URLSearchParams(window.location.search);
                                const searchParam = urlParams.get(paramName);
                                if (removeFromUrl) {
                                    urlParams.delete(paramName);
                                const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
                                }${window.location.hash}`;
                                window.history.replaceState({ }, document.title, newUrl);
	}
                                if (searchParam) {
                                    storage.setItem(storageKey, searchParam);
                                return searchParam;
	}
                                if (defaultValue) {
                                    storage.setItem(storageKey, defaultValue);
                                return defaultValue;
	}
                                const storedValue = storage.getItem(storageKey);
                                if (storedValue) {
		return storedValue;
	}
                                return null;
}

const getAppParams = () => {
	if (getAppParamValue("clear_access_token") === 'true') {
                                    storage.removeItem('base44_access_token');
                                storage.removeItem('token');
	}
                                return {
                                    appId: getAppParamValue("app_id", {defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
                                token: getAppParamValue("access_token", {removeFromUrl: true }),
                                fromUrl: getAppParamValue("from_url", {defaultValue: window.location.href }),
                                functionsVersion: getAppParamValue("functions_version", {defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION }),
                                appBaseUrl: getAppParamValue("app_base_url", {defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL }),
	}
}


                                export const appParams = {
                                    ...getAppParams()
                                }
                                import React, {createContext, useState, useContext, useEffect} from 'react';
                                import {base44} from '@/api/base44Client';
                                import {appParams} from '@/lib/app-params';
                                import {createAxiosClient} from '@base44/sdk/dist/utils/axios-client';

                                const AuthContext = createContext();

                                export const AuthProvider = ({children}) => {
  const [user, setUser] = useState(null);
                                const [isAuthenticated, setIsAuthenticated] = useState(false);
                                const [isLoadingAuth, setIsLoadingAuth] = useState(true);
                                const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
                                const [authError, setAuthError] = useState(null);
                                const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only {id, public_settings}

  useEffect(() => {
                                    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
                                    setIsLoadingPublicSettings(true);
                                setAuthError(null);

                                // First, check app public settings (with token if available)
                                // This will tell us if auth is required, user not registered, etc.
                                const appClient = createAxiosClient({
                                    baseURL: `/api/apps/public`,
                                headers: {
                                    'X-App-Id': appParams.appId
        },
                                token: appParams.token, // Include token if available
                                interceptResponses: true
      });

                                try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
                                setAppPublicSettings(publicSettings);

                                // If we got the app public settings successfully, check if user is authenticated
                                if (appParams.token) {
                                    await checkUserAuth();
        } else {
                                    setIsLoadingAuth(false);
                                setIsAuthenticated(false);
        }
                                setIsLoadingPublicSettings(false);
      } catch (appError) {
                                    console.error('App state check failed:', appError);

                                // Handle app-level errors
                                if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
                                if (reason === 'auth_required') {
                                    setAuthError({
                                        type: 'auth_required',
                                        message: 'Authentication required'
                                    });
          } else if (reason === 'user_not_registered') {
                                    setAuthError({
                                        type: 'user_not_registered',
                                        message: 'User not registered for this app'
                                    });
          } else {
                                    setAuthError({
                                        type: reason,
                                        message: appError.message
                                    });
          }
        } else {
                                    setAuthError({
                                        type: 'unknown',
                                        message: appError.message || 'Failed to load app'
                                    });
        }
                                setIsLoadingPublicSettings(false);
                                setIsLoadingAuth(false);
      }
    } catch (error) {
                                    console.error('Unexpected error:', error);
                                setAuthError({
                                    type: 'unknown',
                                message: error.message || 'An unexpected error occurred'
      });
                                setIsLoadingPublicSettings(false);
                                setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
                                    // Now check if the user is authenticated
                                    setIsLoadingAuth(true);
                                const currentUser = await base44.auth.me();
                                setUser(currentUser);
                                setIsAuthenticated(true);
                                setIsLoadingAuth(false);
    } catch (error) {
                                    console.error('User auth check failed:', error);
                                setIsLoadingAuth(false);
                                setIsAuthenticated(false);

                                // If user auth fails, it might be an expired token
                                if (error.status === 401 || error.status === 403) {
                                    setAuthError({
                                        type: 'auth_required',
                                        message: 'Authentication required'
                                    });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
                                    setUser(null);
                                setIsAuthenticated(false);

                                if (shouldRedirect) {
                                    // Use the SDK's logout method which handles token cleanup and redirect
                                    base44.auth.logout(window.location.href);
    } else {
                                    // Just remove the token without redirect
                                    base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
                                    // Use the SDK's redirectToLogin method
                                    base44.auth.redirectToLogin(window.location.href);
  };

                                return (
                                <AuthContext.Provider value={{
                                    user,
                                    isAuthenticated,
                                    isLoadingAuth,
                                    isLoadingPublicSettings,
                                    authError,
                                    appPublicSettings,
                                    logout,
                                    navigateToLogin,
                                    checkAppState
                                }}>
                                    {children}
                                </AuthContext.Provider>
                                );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
                                if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
                                return context;
};
                                import {useLocation} from 'react-router-dom';
                                import {base44} from '@/api/base44Client';
                                import {useQuery} from '@tanstack/react-query';


                                export default function PageNotFound({ }) {
    const location = useLocation();
                                const pageName = location.pathname.substring(1);

                                const {data: authData, isFetched } = useQuery({
                                    queryKey: ['user'],
        queryFn: async () => {
            try {
                const user = await base44.auth.me();
                                return {user, isAuthenticated: true };
            } catch (error) {
                return {user: null, isAuthenticated: false };
            }
        }
    });

                                return (
                                <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
                                    <div className="max-w-md w-full">
                                        <div className="text-center space-y-6">
                                            {/* 404 Error Code */}
                                            <div className="space-y-2">
                                                <h1 className="text-7xl font-light text-slate-300">404</h1>
                                                <div className="h-0.5 w-16 bg-slate-200 mx-auto"></div>
                                            </div>

                                            {/* Main Message */}
                                            <div className="space-y-3">
                                                <h2 className="text-2xl font-medium text-slate-800">
                                                    Page Not Found
                                                </h2>
                                                <p className="text-slate-600 leading-relaxed">
                                                    The page <span className="font-medium text-slate-700">"{pageName}"</span> could not be found in this application.
                                                </p>
                                            </div>

                                            {/* Admin Note */}
                                            {isFetched && authData.isAuthenticated && authData.user?.role === 'admin' && (
                                                <div className="mt-8 p-4 bg-slate-100 rounded-lg border border-slate-200">
                                                    <div className="flex items-start space-x-3">
                                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center mt-0.5">
                                                            <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                                                        </div>
                                                        <div className="text-left space-y-1">
                                                            <p className="text-sm font-medium text-slate-700">Admin Note</p>
                                                            <p className="text-sm text-slate-600 leading-relaxed">
                                                                This could mean that the AI hasn't implemented this page yet. Ask it to implement it in the chat.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action Button */}
                                            <div className="pt-6">
                                                <button
                                                    onClick={() => window.location.href = '/'}
                                                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                                    </svg>
                                                    Go Home
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                )
}
                                import {QueryClient} from '@tanstack/react-query';


                                export const queryClientInstance = new QueryClient({
                                    defaultOptions: {
                                    queries: {
                                    refetchOnWindowFocus: false,
                                retry: 1,
		},
	},
});
                                import {clsx} from "clsx"
                                import {twMerge} from "tailwind-merge"

                                export function cn(...inputs) {
  return twMerge(clsx(inputs))
}


                                export const isIframe = window.self !== window.top;
                                import React from 'react';
                                import {base44} from '@/api/base44Client';
                                import {useQuery} from '@tanstack/react-query';
                                import {Link} from 'react-router-dom';
                                import {Button} from '@/components/ui/button';
                                import {Sparkles, Trophy, Star, ArrowLeft} from 'lucide-react';
                                import {motion} from 'framer-motion';

                                export default function BadgeShare() {
  const shareCode = window.location.pathname.split('/badge/')[1];

                                const {data: badges = [], isLoading } = useQuery({
                                    queryKey: ['badge-share', shareCode],
    queryFn: () => base44.entities.ContributionBadge.filter({share_code: shareCode }),
                                enabled: !!shareCode,
  });

                                const badge = badges[0];

                                if (isLoading) {
    return (
                                <div className="min-h-screen flex items-center justify-center">
                                    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                </div>
                                );
  }

                                if (!badge) {
    return (
                                <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
                                    <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
                                    <h1 className="text-2xl font-bold mb-2">找不到此徽章</h1>
                                    <Link to="/"><Button variant="outline">回首頁</Button></Link>
                                </div>
                                );
  }

                                return (
                                <div className="min-h-screen bg-background flex items-center justify-center p-6">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="max-w-sm w-full"
                                    >
                                        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary/10 via-card to-accent/10 border shadow-2xl shadow-primary/10">
                                            {/* Decorative */}
                                            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
                                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />

                                            <div className="relative p-8 text-center">
                                                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                                    <Trophy className="w-10 h-10 text-primary" />
                                                </div>

                                                <p className="text-sm text-muted-foreground mb-1">貢獻證明</p>
                                                <h1 className="text-2xl font-black mb-1">{badge.badge_title}</h1>

                                                <div className="my-6 py-4 border-y border-border/50">
                                                    <p className="text-sm text-muted-foreground">支持者</p>
                                                    <p className="text-xl font-bold mt-1">{badge.donor_name}</p>
                                                </div>

                                                <div className="space-y-2 text-sm">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">VTuber</span>
                                                        <span className="font-medium">{badge.vtuber_name}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">里程碑</span>
                                                        <span className="font-medium">{badge.milestone_title}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">累計貢獻</span>
                                                        <span className="font-bold text-primary">NT$ {(badge.total_contributed || 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">取得時間</span>
                                                        <span className="font-medium">{new Date(badge.created_date).toLocaleDateString('zh-TW')}</span>
                                                    </div>
                                                </div>

                                                <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                                                    <Star className="w-3 h-3 text-primary" />
                                                    <span>MileStar 永久貢獻證明</span>
                                                    <Star className="w-3 h-3 text-primary" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-center mt-6">
                                            <Link to="/">
                                                <Button variant="ghost" size="sm">
                                                    <ArrowLeft className="w-4 h-4 mr-1" /> 回到 MileStar
                                                </Button>
                                            </Link>
                                        </div>
                                    </motion.div>
                                </div>
                                );
}
                                import React, {useState} from 'react';
                                import {Link} from 'react-router-dom';
                                import {Button} from '@/components/ui/button';
                                import {Heart, Star, Trophy, Sparkles, ArrowRight, Users, Target, Zap, Gift, BadgeCheck} from 'lucide-react';
                                import {motion} from 'framer-motion';
                                import {base44} from '@/api/base44Client';
                                import {useQuery} from '@tanstack/react-query';

                                const fadeUp = {
                                    hidden: {opacity: 0, y: 40 },
  visible: (i) => ({opacity: 1, y: 0, transition: {delay: i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] } })
};

                                export default function Home() {
  const {data: profiles = [] } = useQuery({
                                    queryKey: ['featured-profiles'],
    queryFn: () => base44.entities.VTuberProfile.list('-supporter_count', 6),
  });

                                return (
                                <div className="min-h-screen bg-background text-foreground overflow-x-hidden" style={{ colorScheme: 'light' }}>

                                    {/* ── NAV ── */}
                                    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/40">
                                        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                                    <Sparkles className="w-4 h-4 text-white" />
                                                </div>
                                                <span className="text-lg font-black tracking-tight">V-Up!</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Link to="/my-badges">
                                                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">我的徽章</Button>
                                                </Link>
                                                <Link to="/dashboard">
                                                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg px-5">VTuber 後台</Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </nav>

                                    {/* ── HERO ── */}
                                    <header className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden">
                                        {/* Vivid bg blobs */}
                                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(139,92,246,0.18),transparent)]" />
                                        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-primary/15 rounded-full blur-[120px]" />
                                        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-accent/15 rounded-full blur-[100px]" />
                                        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[600px] h-40 bg-cyan-500/8 rounded-full blur-[80px]" />

                                        {/* Ticker tape */}
                                        <div className="absolute top-16 left-0 right-0 overflow-hidden whitespace-nowrap border-y border-primary/20 bg-primary/5 py-2">
                                            <div className="inline-flex gap-12 animate-[marquee_20s_linear_infinite]">
                                                {Array(6).fill('✦ V-Up! 綻放計畫  ✦ 陪他成長  ✦ 限定徽章  ✦ 里程碑斗內  ✦ 永久證明').map((t, i) => (
                                                    <span key={i} className="text-xs tracking-widest text-primary/60 font-medium uppercase">{t}</span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
                                            <motion.div initial="hidden" animate="visible" className="space-y-7">

                                                <motion.div variants={fadeUp} custom={0}
                                                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-semibold tracking-wide">
                                                    <Sparkles className="w-3.5 h-3.5" />
                                                    綻放計畫 · VTuber × 粉絲共成長
                                                </motion.div>

                                                <motion.h1 variants={fadeUp} custom={1}
                                                    className="text-6xl sm:text-7xl md:text-[5.5rem] lg:text-[6.5rem] font-black leading-[0.95] tracking-tighter">
                                                    <span className="block text-foreground">V-Up!</span>
                                                    <span className="block bg-gradient-to-r from-primary via-fuchsia-400 to-accent bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(168,85,247,0.5)]">
                                                        綻放計畫
                                                    </span>
                                                </motion.h1>

                                                <motion.p variants={fadeUp} custom={2}
                                                    className="text-xl md:text-2xl text-muted-foreground font-medium tracking-wide">
                                                    陪他成長，做他最初的傳奇
                                                </motion.p>

                                                <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                                                    <Link to="/dashboard">
                                                        <Button size="lg"
                                                            className="group relative h-14 px-10 text-base font-bold rounded-2xl bg-gradient-to-r from-primary to-fuchsia-500 hover:opacity-90 shadow-[0_0_40px_rgba(139,92,246,0.4)] transition-all">
                                                            <span>加入這場奇蹟</span>
                                                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                                        </Button>
                                                    </Link>
                                                    <Link to="/#how-it-works">
                                                        <Button size="lg" variant="outline"
                                                            className="h-14 px-8 text-base font-semibold rounded-2xl border-border bg-background/50 hover:bg-secondary backdrop-blur">
                                                            了解更多
                                                        </Button>
                                                    </Link>
                                                </motion.div>

                                            </motion.div>
                                        </div>

                                        {/* scroll hint */}
                                        <motion.div
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
                                            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-muted-foreground/40"
                                        >
                                            <div className="w-px h-12 bg-gradient-to-b from-transparent to-muted-foreground/30" />
                                            <span className="text-xs tracking-widest uppercase">Scroll</span>
                                        </motion.div>
                                    </header>

                                    {/* ── DUAL AUDIENCE ── */}
                                    <section id="how-it-works" className="relative max-w-7xl mx-auto px-6 py-28">
                                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                            className="text-center mb-16">
                                            <p className="text-primary text-sm font-bold tracking-widest uppercase mb-3">平台面向</p>
                                            <h2 className="text-4xl md:text-5xl font-black tracking-tight">兩個你，一場奇蹟</h2>
                                        </motion.div>

                                        <div className="grid md:grid-cols-2 gap-6">
                                            {/* VTuber card */}
                                            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                                                transition={{ duration: 0.7 }}
                                                className="relative rounded-3xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-8 md:p-10">
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
                                                <div className="relative">
                                                    <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-6">
                                                        <Zap className="w-7 h-7 text-primary" />
                                                    </div>
                                                    <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase mb-4">
                                                        我是 VTuber
                                                    </div>
                                                    <h3 className="text-3xl font-black mb-4 leading-tight">設定里程碑<br />讓夢想看得見</h3>
                                                    <ul className="space-y-3 text-muted-foreground mb-8">
                                                        {['自訂升級目標（設備、活動、周邊）', '粉絲共推進度，即時看見成長', '達成後發布限定感謝貼文', '解鎖下一個目標，繼續綻放'].map(t => (
                                                            <li key={t} className="flex items-center gap-2.5 text-sm">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />{t}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <Link to="/dashboard">
                                                        <Button className="rounded-xl bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/30">
                                                            建立我的頁面 <ArrowRight className="w-4 h-4 ml-1.5" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </motion.div>

                                            {/* Fan card */}
                                            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                                                transition={{ duration: 0.7 }}
                                                className="relative rounded-3xl overflow-hidden border border-accent/20 bg-gradient-to-br from-accent/10 via-card to-card p-8 md:p-10">
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
                                                <div className="relative">
                                                    <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center mb-6">
                                                        <Heart className="w-7 h-7 text-accent" />
                                                    </div>
                                                    <div className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold tracking-wider uppercase mb-4">
                                                        我是粉絲
                                                    </div>
                                                    <h3 className="text-3xl font-black mb-4 leading-tight">成為他成長<br />最初的傳奇</h3>
                                                    <ul className="space-y-3 text-muted-foreground mb-8">
                                                        {['斗內支持喜愛的 VTuber 達成里程碑', '獲得限定永久貢獻徽章證明', '查看專屬感謝訊息與限定貼文', '對外分享炫耀「我是老粉」'].map(t => (
                                                            <li key={t} className="flex items-center gap-2.5 text-sm">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />{t}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <Link to="/my-badges">
                                                        <Button className="rounded-xl bg-accent hover:bg-accent/90 font-bold shadow-lg shadow-accent/30">
                                                            查看我的徽章 <Trophy className="w-4 h-4 ml-1.5" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </motion.div>
                                        </div>
                                    </section>

                                    {/* ── HOW IT WORKS ── */}
                                    <section className="py-24 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
                                        <div className="max-w-7xl mx-auto px-6">
                                            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                                className="text-center mb-16">
                                                <p className="text-primary text-sm font-bold tracking-widest uppercase mb-3">流程</p>
                                                <h2 className="text-4xl md:text-5xl font-black tracking-tight">三步驟，點燃成長</h2>
                                            </motion.div>
                                            <div className="grid md:grid-cols-3 gap-6 relative">
                                                {/* connector line */}
                                                <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-px bg-gradient-to-r from-primary/40 to-accent/40" />
                                                {[
                                                    { step: '01', icon: Target, color: 'primary', title: 'VTuber 設定目標', desc: '自訂里程碑名稱、金額、徽章與感謝訊息，公開頁面一鍵分享。' },
                                                    { step: '02', icon: Users, color: 'fuchsia', title: '粉絲共同推進', desc: '粉絲斗內，即時更新進度條，一起見證從 0 到達成的那一刻。' },
                                                    { step: '03', icon: BadgeCheck, color: 'accent', title: '獲得永久証明', desc: '達成後每位貢獻者獲得限定徽章，永久存在，可對外分享炫耀。' },
                                                ].map((s, i) => (
                                                    <motion.div key={s.step}
                                                        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                                        transition={{ delay: i * 0.15 }}
                                                        className="relative rounded-2xl border border-border bg-card p-8 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500">
                                                        <div className="text-7xl font-black text-border/30 absolute top-6 right-6 leading-none">{s.step}</div>
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${s.color === 'primary' ? 'bg-primary/15' : s.color === 'accent' ? 'bg-accent/15' : 'bg-fuchsia-500/15'}`}>
                                                            <s.icon className={`w-6 h-6 ${s.color === 'primary' ? 'text-primary' : s.color === 'accent' ? 'text-accent' : 'text-fuchsia-400'}`} />
                                                        </div>
                                                        <h3 className="text-xl font-bold mb-2">{s.title}</h3>
                                                        <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    </section>

                                    {/* ── BADGE SHOWCASE ── */}
                                    <section className="max-w-7xl mx-auto px-6 py-24">
                                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                            className="text-center mb-12">
                                            <p className="text-accent text-sm font-bold tracking-widest uppercase mb-3">限定徽章</p>
                                            <h2 className="text-4xl md:text-5xl font-black tracking-tight">你的支持，永遠留存</h2>
                                            <p className="text-muted-foreground mt-4 text-lg max-w-2xl mx-auto">
                                                每位貢獻者都能獲得限定永久徽章——這不只是斗內，是你陪他走過的歷史。
                                            </p>
                                        </motion.div>

                                        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                                            {[
                                                { title: '設備升級推手', vt: '星野ミナ', milestone: '升級直播設備', amount: '3,500', color: 'from-violet-600 to-purple-800' },
                                                { title: '見面會創始支持者', vt: '月光あかり', milestone: '首次粉絲見面會', amount: '5,000', color: 'from-pink-600 to-rose-800' },
                                                { title: '雙螢幕大功臣', vt: '翠玉Gaming', milestone: '購買雙螢幕', amount: '1,200', color: 'from-emerald-600 to-teal-800' },
                                            ].map((b, i) => (
                                                <motion.div key={b.title}
                                                    initial={{ opacity: 0, y: 30, rotate: i === 1 ? 0 : i === 0 ? -3 : 3 }}
                                                    whileInView={{ opacity: 1, y: 0, rotate: i === 1 ? 0 : i === 0 ? -3 : 3 }}
                                                    whileHover={{ scale: 1.05, rotate: 0 }}
                                                    viewport={{ once: true }}
                                                    transition={{ delay: i * 0.1 }}
                                                    className={`relative w-72 rounded-3xl bg-gradient-to-br ${b.color} p-6 text-white shadow-2xl shadow-black/30 ${i === 1 ? 'z-10 md:-mt-4' : ''}`}>
                                                    <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent)]" />
                                                    <div className="relative">
                                                        <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center mb-4">
                                                            <Trophy className="w-7 h-7 text-white" />
                                                        </div>
                                                        <div className="text-xs font-bold tracking-widest uppercase text-white/60 mb-1">貢獻證明</div>
                                                        <div className="text-xl font-black leading-tight mb-4">{b.title}</div>
                                                        <div className="space-y-1.5 text-sm text-white/80">
                                                            <div className="flex justify-between"><span>VTuber</span><span className="font-semibold text-white">{b.vt}</span></div>
                                                            <div className="flex justify-between"><span>里程碑</span><span className="font-semibold text-white">{b.milestone}</span></div>
                                                            <div className="flex justify-between"><span>貢獻金額</span><span className="font-bold text-yellow-300">NT$ {b.amount}</span></div>
                                                        </div>
                                                        <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-1.5 text-xs text-white/40">
                                                            <Sparkles className="w-3 h-3" /> V-Up! 永久貢獻証明
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </section>

                                    {/* ── FEATURED VTUBERS ── */}
                                    {profiles.length > 0 && (
                                        <section className="max-w-7xl mx-auto px-6 py-20">
                                            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                                className="flex items-end justify-between mb-10">
                                                <div>
                                                    <p className="text-primary text-sm font-bold tracking-widest uppercase mb-2">正在進行中</p>
                                                    <h2 className="text-3xl md:text-4xl font-black">熱門 VTuber</h2>
                                                </div>
                                            </motion.div>
                                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                                {profiles.map((p, i) => (
                                                    <motion.div key={p.id}
                                                        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                                        transition={{ delay: i * 0.08 }}>
                                                        <Link to={`/vtuber/${p.slug}`}>
                                                            <div className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-400">
                                                                <div className="h-28 bg-gradient-to-r from-primary/30 to-accent/20 relative">
                                                                    {p.banner_url && <img src={p.banner_url} alt="" className="w-full h-full object-cover" />}
                                                                </div>
                                                                <div className="px-5 pb-5 -mt-7 relative">
                                                                    <div className="w-14 h-14 rounded-full border-3 border-card bg-secondary overflow-hidden mb-2 ring-2 ring-primary/20">
                                                                        {p.avatar_url ? (
                                                                            <img src={p.avatar_url} alt={p.display_name} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-xl font-black text-primary">{p.display_name?.[0]}</div>
                                                                        )}
                                                                    </div>
                                                                    <h3 className="font-black text-base">{p.display_name}</h3>
                                                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.bio}</p>
                                                                    <div className="flex items-center justify-between mt-3">
                                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                            <Star className="w-3 h-3 text-primary" fill="currentColor" /> {p.supporter_count || 0} 支持者
                                                                        </span>
                                                                        <span className="text-xs font-bold text-primary">支持 →</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {/* ── FINAL CTA ── */}
                                    <section className="py-28 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-fuchsia-500/10 to-accent/15" />
                                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_50%,rgba(139,92,246,0.15),transparent)]" />
                                        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                            className="relative z-10 max-w-3xl mx-auto px-6 text-center space-y-8">
                                            <h2 className="text-5xl md:text-6xl font-black tracking-tight leading-tight">
                                                加入這場<br />
                                                <span className="bg-gradient-to-r from-primary via-fuchsia-400 to-accent bg-clip-text text-transparent">奇蹟</span>
                                            </h2>
                                            <p className="text-xl text-muted-foreground">不論你是夢想綻放的 VTuber，或是第一批見證的粉絲——</p>
                                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                                <Link to="/dashboard">
                                                    <Button size="lg" className="h-14 px-10 text-base font-bold rounded-2xl bg-gradient-to-r from-primary to-fuchsia-500 hover:opacity-90 shadow-[0_0_50px_rgba(139,92,246,0.4)]">
                                                        我是 VTuber，開始綻放
                                                    </Button>
                                                </Link>
                                                <Link to="/">
                                                    <Button size="lg" variant="outline" className="h-14 px-10 text-base font-semibold rounded-2xl border-white/10 bg-white/5 hover:bg-white/10"
                                                        onClick={() => document.getElementById('featured')?.scrollIntoView({ behavior: 'smooth' })}>
                                                        我是粉絲，探索 VTuber
                                                    </Button>
                                                </Link>
                                            </div>
                                        </motion.div>
                                    </section>

                                    {/* ── FOOTER ── */}
                                    <footer className="border-t border-border/40 py-10">
                                        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                                    <Sparkles className="w-3 h-3 text-white" />
                                                </div>
                                                <span className="font-black text-foreground">V-Up!</span>
                                                <span className="text-muted-foreground/40">綻放計畫</span>
                                            </div>
                                            <p>陪他成長，做他最初的傳奇 ✦</p>
                                        </div>
                                    </footer>

                                    <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
                                </div>
                                );
}
                                import React, {useState} from 'react';
                                import {base44} from '@/api/base44Client';
                                import {useQuery} from '@tanstack/react-query';
                                import {Button} from '@/components/ui/button';
                                import {Input} from '@/components/ui/input';
                                import {Card, CardContent} from '@/components/ui/card';
                                import {Badge} from '@/components/ui/badge';
                                import {Link} from 'react-router-dom';
                                import {Search, Trophy, Share2, Sparkles, ArrowLeft, ExternalLink} from 'lucide-react';
                                import {toast} from 'sonner';
                                import {motion} from 'framer-motion';

                                export default function MyBadges() {
  const [email, setEmail] = useState('');
                                const [searchEmail, setSearchEmail] = useState('');

                                const {data: user } = useQuery({
                                    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

                                const lookupEmail = searchEmail || user?.email || '';

                                const {data: badges = [], isLoading } = useQuery({
                                    queryKey: ['my-badges', lookupEmail],
    queryFn: () => base44.entities.ContributionBadge.filter({donor_email: lookupEmail }, '-created_date'),
                                enabled: !!lookupEmail,
  });

  const handleSearch = (e) => {
                                    e.preventDefault();
                                setSearchEmail(email);
  };

  const shareBadge = (badge) => {
    const url = `${window.location.origin}/badge/${badge.share_code}`;
                                navigator.clipboard.writeText(url);
                                toast.success('徽章分享連結已複製！');
  };

                                return (
                                <div className="min-h-screen bg-background">
                                    <div className="max-w-3xl mx-auto px-4 py-8">
                                        <div className="flex items-center gap-3 mb-8">
                                            <Link to="/">
                                                <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
                                            </Link>
                                            <div>
                                                <h1 className="text-2xl font-bold flex items-center gap-2">
                                                    <Trophy className="w-6 h-6 text-primary" />
                                                    我的徽章
                                                </h1>
                                                <p className="text-sm text-muted-foreground">你支持 VTuber 的永久證明</p>
                                            </div>
                                        </div>

                                        {!user && (
                                            <form onSubmit={handleSearch} className="flex gap-2 mb-8">
                                                <Input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="輸入你的 Email 查詢徽章..."
                                                    className="flex-1"
                                                />
                                                <Button type="submit"><Search className="w-4 h-4 mr-1" /> 查詢</Button>
                                            </form>
                                        )}

                                        {isLoading ? (
                                            <div className="flex justify-center py-20">
                                                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                            </div>
                                        ) : badges.length === 0 ? (
                                            <div className="text-center py-20">
                                                <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                                <h2 className="text-xl font-bold mb-2">還沒有徽章</h2>
                                                <p className="text-muted-foreground mb-6">支持你喜歡的 VTuber 來獲得永久貢獻徽章！</p>
                                                <Link to="/"><Button>探索 VTuber</Button></Link>
                                            </div>
                                        ) : (
                                            <div className="grid gap-4">
                                                {badges.map((badge, i) => (
                                                    <motion.div
                                                        key={badge.id}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                    >
                                                        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                                                            <CardContent className="p-0">
                                                                <div className="flex items-stretch">
                                                                    <div className="w-2 bg-gradient-to-b from-primary to-accent shrink-0" />
                                                                    <div className="flex-1 p-5">
                                                                        <div className="flex items-start justify-between gap-3">
                                                                            <div>
                                                                                <Badge className="bg-primary/10 text-primary border-primary/20 mb-2">
                                                                                    {badge.badge_title}
                                                                                </Badge>
                                                                                <h3 className="font-bold text-lg">{badge.vtuber_name}</h3>
                                                                                <p className="text-sm text-muted-foreground mt-0.5">
                                                                                    里程碑：{badge.milestone_title}
                                                                                </p>
                                                                                <p className="text-sm text-muted-foreground">
                                                                                    累計貢獻：NT$ {(badge.total_contributed || 0).toLocaleString()}
                                                                                </p>
                                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                                    {new Date(badge.created_date).toLocaleDateString('zh-TW')} 取得
                                                                                </p>
                                                                            </div>
                                                                            <div className="flex gap-1 shrink-0">
                                                                                <Button variant="outline" size="sm" onClick={() => shareBadge(badge)}>
                                                                                    <Share2 className="w-4 h-4 mr-1" /> 分享
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                );
}
                                import React, {useState} from 'react';
                                import {base44} from '@/api/base44Client';
                                import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
                                import {Button} from '@/components/ui/button';
                                import {Input} from '@/components/ui/input';
                                import {Textarea} from '@/components/ui/textarea';
                                import {Label} from '@/components/ui/label';
                                import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
                                import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
                                import {Badge} from '@/components/ui/badge';
                                import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
                                import {toast} from 'sonner';
                                import {Plus, Settings, Trophy, Eye, Copy, Sparkles, Link as LinkIcon, ArrowRight} from 'lucide-react';
                                import {Link} from 'react-router-dom';
                                import MilestoneForm from '@/components/dashboard/MilestoneForm';
                                import MilestoneCard from '@/components/dashboard/MilestoneCard';
                                import ProfileForm from '@/components/dashboard/ProfileForm';
                                import MilestonePostManager from '@/components/dashboard/MilestonePostManager';

                                export default function VTuberDashboard() {
  const queryClient = useQueryClient();
                                const [showMilestoneForm, setShowMilestoneForm] = useState(false);
                                const [editingMilestone, setEditingMilestone] = useState(null);

                                const {data: user } = useQuery({
                                    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

                                const {data: profiles = [], isLoading: loadingProfile } = useQuery({
                                    queryKey: ['my-profile', user?.email],
    queryFn: () => base44.entities.VTuberProfile.filter({created_by: user.email }),
                                enabled: !!user?.email,
  });

                                const profile = profiles[0];

                                const {data: milestones = [] } = useQuery({
                                    queryKey: ['my-milestones', profile?.id],
    queryFn: () => base44.entities.Milestone.filter({vtuber_profile_id: profile.id }, 'order'),
                                enabled: !!profile?.id,
  });

                                const {data: donations = [] } = useQuery({
                                    queryKey: ['my-donations', profile?.id],
    queryFn: () => base44.entities.Donation.filter({vtuber_profile_id: profile.id }, '-created_date', 50),
                                enabled: !!profile?.id,
  });

  const activeMilestone = milestones.find(m => m.status === 'active');
  const completedMilestones = milestones.filter(m => m.status === 'completed');
  const upcomingMilestones = milestones.filter(m => m.status === 'upcoming');

                                if (loadingProfile) {
    return (
                                <div className="min-h-screen flex items-center justify-center">
                                    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                </div>
                                );
  }

                                if (!profile) {
    return <ProfileForm user={user} isNew />;
  }

                                const publicUrl = `${window.location.origin}/vtuber/${profile.slug}`;

                                return (
                                <div className="min-h-screen bg-background">
                                    <div className="max-w-6xl mx-auto px-4 py-8">
                                        {/* Header */}
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                                            <div>
                                                <h1 className="text-3xl font-bold flex items-center gap-2">
                                                    <Sparkles className="w-7 h-7 text-primary" />
                                                    {profile.display_name} 的後台
                                                </h1>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <button
                                                        onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success('已複製連結！'); }}
                                                        className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                                                    >
                                                        <LinkIcon className="w-3.5 h-3.5" />
                                                        {publicUrl}
                                                        <Copy className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Link to={`/vtuber/${profile.slug}`}>
                                                    <Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-1" /> 查看公開頁面</Button>
                                                </Link>
                                                <Link to="/">
                                                    <Button variant="ghost" size="sm">首頁</Button>
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                            {[
                                                { label: '總募集金額', value: `NT$ ${(profile.total_raised || 0).toLocaleString()}` },
                                                { label: '支持者數', value: profile.supporter_count || 0 },
                                                { label: '已完成里程碑', value: completedMilestones.length },
                                                { label: '進行中進度', value: activeMilestone ? `${Math.round((activeMilestone.current_amount / activeMilestone.target_amount) * 100)}%` : '—' },
                                            ].map((s) => (
                                                <Card key={s.label}>
                                                    <CardContent className="pt-6">
                                                        <p className="text-sm text-muted-foreground">{s.label}</p>
                                                        <p className="text-2xl font-bold mt-1">{s.value}</p>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>

                                        <Tabs defaultValue="milestones" className="space-y-6">
                                            <TabsList>
                                                <TabsTrigger value="milestones">里程碑管理</TabsTrigger>
                                                <TabsTrigger value="posts">限定貼文</TabsTrigger>
                                                <TabsTrigger value="donations">斗內紀錄</TabsTrigger>
                                                <TabsTrigger value="settings">設定</TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="milestones" className="space-y-6">
                                                {/* Active Milestone */}
                                                {activeMilestone && (
                                                    <div>
                                                        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                                            進行中
                                                        </h2>
                                                        <MilestoneCard
                                                            milestone={activeMilestone}
                                                            isActive
                                                            onEdit={(m) => { setEditingMilestone(m); setShowMilestoneForm(true); }}
                                                        />
                                                    </div>
                                                )}

                                                {/* Add milestone button */}
                                                {!activeMilestone && (
                                                    <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => { setEditingMilestone(null); setShowMilestoneForm(true); }}>
                                                        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                                            <Plus className="w-10 h-10 mb-3" />
                                                            <p className="font-medium">新增里程碑</p>
                                                            <p className="text-sm mt-1">設定你的下一個成長目標</p>
                                                        </CardContent>
                                                    </Card>
                                                )}

                                                {/* Upcoming */}
                                                {upcomingMilestones.length > 0 && (
                                                    <div>
                                                        <h2 className="text-lg font-semibold mb-3">即將到來</h2>
                                                        <div className="space-y-3">
                                                            {upcomingMilestones.map(m => (
                                                                <MilestoneCard
                                                                    key={m.id}
                                                                    milestone={m}
                                                                    onEdit={(m) => { setEditingMilestone(m); setShowMilestoneForm(true); }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Completed */}
                                                {completedMilestones.length > 0 && (
                                                    <div>
                                                        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                                            <Trophy className="w-5 h-5 text-primary" />
                                                            已完成
                                                        </h2>
                                                        <div className="space-y-3">
                                                            {completedMilestones.map(m => (
                                                                <MilestoneCard key={m.id} milestone={m} isCompleted />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {activeMilestone && (
                                                    <Button variant="outline" onClick={() => { setEditingMilestone(null); setShowMilestoneForm(true); }}>
                                                        <Plus className="w-4 h-4 mr-1" /> 新增下一個里程碑
                                                    </Button>
                                                )}
                                            </TabsContent>

                                            <TabsContent value="posts">
                                                <MilestonePostManager profileId={profile.id} milestones={[...completedMilestones, ...(activeMilestone ? [activeMilestone] : [])]} />
                                            </TabsContent>

                                            <TabsContent value="donations">
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle>斗內紀錄</CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        {donations.length === 0 ? (
                                                            <p className="text-muted-foreground text-center py-8">還沒有斗內紀錄</p>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                {donations.map(d => (
                                                                    <div key={d.id} className="flex items-center justify-between py-3 border-b last:border-0">
                                                                        <div>
                                                                            <p className="font-medium">{d.is_anonymous ? '匿名' : d.donor_name}</p>
                                                                            {d.message && <p className="text-sm text-muted-foreground mt-0.5">{d.message}</p>}
                                                                            <p className="text-xs text-muted-foreground mt-1">{new Date(d.created_date).toLocaleDateString('zh-TW')}</p>
                                                                        </div>
                                                                        <span className="text-lg font-bold text-primary">NT$ {d.amount?.toLocaleString()}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </TabsContent>

                                            <TabsContent value="settings">
                                                <ProfileForm user={user} existingProfile={profile} />
                                            </TabsContent>
                                        </Tabs>
                                    </div>

                                    {/* Milestone Form Dialog */}
                                    <Dialog open={showMilestoneForm} onOpenChange={setShowMilestoneForm}>
                                        <DialogContent className="max-w-lg">
                                            <DialogHeader>
                                                <DialogTitle>{editingMilestone ? '編輯里程碑' : '新增里程碑'}</DialogTitle>
                                            </DialogHeader>
                                            <MilestoneForm
                                                profileId={profile.id}
                                                milestone={editingMilestone}
                                                hasActive={!!activeMilestone}
                                                onDone={() => { setShowMilestoneForm(false); setEditingMilestone(null); }}
                                            />
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                );
}
                                import React, {useState} from 'react';
                                import {base44} from '@/api/base44Client';
                                import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
                                import {Button} from '@/components/ui/button';
                                import {Input} from '@/components/ui/input';
                                import {Textarea} from '@/components/ui/textarea';
                                import {Label} from '@/components/ui/label';
                                import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
                                import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
                                import {Badge} from '@/components/ui/badge';
                                import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
                                import {toast} from 'sonner';
                                import {Plus, Settings, Trophy, Eye, Copy, Sparkles, Link as LinkIcon, ArrowRight} from 'lucide-react';
                                import {Link} from 'react-router-dom';
                                import MilestoneForm from '@/components/dashboard/MilestoneForm';
                                import MilestoneCard from '@/components/dashboard/MilestoneCard';
                                import ProfileForm from '@/components/dashboard/ProfileForm';
                                import MilestonePostManager from '@/components/dashboard/MilestonePostManager';

                                export default function VTuberDashboard() {
  const queryClient = useQueryClient();
                                const [showMilestoneForm, setShowMilestoneForm] = useState(false);
                                const [editingMilestone, setEditingMilestone] = useState(null);

                                const {data: user } = useQuery({
                                    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

                                const {data: profiles = [], isLoading: loadingProfile } = useQuery({
                                    queryKey: ['my-profile', user?.email],
    queryFn: () => base44.entities.VTuberProfile.filter({created_by: user.email }),
                                enabled: !!user?.email,
  });

                                const profile = profiles[0];

                                const {data: milestones = [] } = useQuery({
                                    queryKey: ['my-milestones', profile?.id],
    queryFn: () => base44.entities.Milestone.filter({vtuber_profile_id: profile.id }, 'order'),
                                enabled: !!profile?.id,
  });

                                const {data: donations = [] } = useQuery({
                                    queryKey: ['my-donations', profile?.id],
    queryFn: () => base44.entities.Donation.filter({vtuber_profile_id: profile.id }, '-created_date', 50),
                                enabled: !!profile?.id,
  });

  const activeMilestone = milestones.find(m => m.status === 'active');
  const completedMilestones = milestones.filter(m => m.status === 'completed');
  const upcomingMilestones = milestones.filter(m => m.status === 'upcoming');

                                if (loadingProfile) {
    return (
                                <div className="min-h-screen flex items-center justify-center">
                                    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                </div>
                                );
  }

                                if (!profile) {
    return <ProfileForm user={user} isNew />;
  }

                                const publicUrl = `${window.location.origin}/vtuber/${profile.slug}`;

                                return (
                                <div className="min-h-screen bg-background">
                                    <div className="max-w-6xl mx-auto px-4 py-8">
                                        {/* Header */}
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                                            <div>
                                                <h1 className="text-3xl font-bold flex items-center gap-2">
                                                    <Sparkles className="w-7 h-7 text-primary" />
                                                    {profile.display_name} 的後台
                                                </h1>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <button
                                                        onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success('已複製連結！'); }}
                                                        className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                                                    >
                                                        <LinkIcon className="w-3.5 h-3.5" />
                                                        {publicUrl}
                                                        <Copy className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Link to={`/vtuber/${profile.slug}`}>
                                                    <Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-1" /> 查看公開頁面</Button>
                                                </Link>
                                                <Link to="/">
                                                    <Button variant="ghost" size="sm">首頁</Button>
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                            {[
                                                { label: '總募集金額', value: `NT$ ${(profile.total_raised || 0).toLocaleString()}` },
                                                { label: '支持者數', value: profile.supporter_count || 0 },
                                                { label: '已完成里程碑', value: completedMilestones.length },
                                                { label: '進行中進度', value: activeMilestone ? `${Math.round((activeMilestone.current_amount / activeMilestone.target_amount) * 100)}%` : '—' },
                                            ].map((s) => (
                                                <Card key={s.label}>
                                                    <CardContent className="pt-6">
                                                        <p className="text-sm text-muted-foreground">{s.label}</p>
                                                        <p className="text-2xl font-bold mt-1">{s.value}</p>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>

                                        <Tabs defaultValue="milestones" className="space-y-6">
                                            <TabsList>
                                                <TabsTrigger value="milestones">里程碑管理</TabsTrigger>
                                                <TabsTrigger value="posts">限定貼文</TabsTrigger>
                                                <TabsTrigger value="donations">斗內紀錄</TabsTrigger>
                                                <TabsTrigger value="settings">設定</TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="milestones" className="space-y-6">
                                                {/* Active Milestone */}
                                                {activeMilestone && (
                                                    <div>
                                                        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                                            進行中
                                                        </h2>
                                                        <MilestoneCard
                                                            milestone={activeMilestone}
                                                            isActive
                                                            onEdit={(m) => { setEditingMilestone(m); setShowMilestoneForm(true); }}
                                                        />
                                                    </div>
                                                )}

                                                {/* Add milestone button */}
                                                {!activeMilestone && (
                                                    <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => { setEditingMilestone(null); setShowMilestoneForm(true); }}>
                                                        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                                            <Plus className="w-10 h-10 mb-3" />
                                                            <p className="font-medium">新增里程碑</p>
                                                            <p className="text-sm mt-1">設定你的下一個成長目標</p>
                                                        </CardContent>
                                                    </Card>
                                                )}

                                                {/* Upcoming */}
                                                {upcomingMilestones.length > 0 && (
                                                    <div>
                                                        <h2 className="text-lg font-semibold mb-3">即將到來</h2>
                                                        <div className="space-y-3">
                                                            {upcomingMilestones.map(m => (
                                                                <MilestoneCard
                                                                    key={m.id}
                                                                    milestone={m}
                                                                    onEdit={(m) => { setEditingMilestone(m); setShowMilestoneForm(true); }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Completed */}
                                                {completedMilestones.length > 0 && (
                                                    <div>
                                                        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                                            <Trophy className="w-5 h-5 text-primary" />
                                                            已完成
                                                        </h2>
                                                        <div className="space-y-3">
                                                            {completedMilestones.map(m => (
                                                                <MilestoneCard key={m.id} milestone={m} isCompleted />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {activeMilestone && (
                                                    <Button variant="outline" onClick={() => { setEditingMilestone(null); setShowMilestoneForm(true); }}>
                                                        <Plus className="w-4 h-4 mr-1" /> 新增下一個里程碑
                                                    </Button>
                                                )}
                                            </TabsContent>

                                            <TabsContent value="posts">
                                                <MilestonePostManager profileId={profile.id} milestones={[...completedMilestones, ...(activeMilestone ? [activeMilestone] : [])]} />
                                            </TabsContent>

                                            <TabsContent value="donations">
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle>斗內紀錄</CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        {donations.length === 0 ? (
                                                            <p className="text-muted-foreground text-center py-8">還沒有斗內紀錄</p>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                {donations.map(d => (
                                                                    <div key={d.id} className="flex items-center justify-between py-3 border-b last:border-0">
                                                                        <div>
                                                                            <p className="font-medium">{d.is_anonymous ? '匿名' : d.donor_name}</p>
                                                                            {d.message && <p className="text-sm text-muted-foreground mt-0.5">{d.message}</p>}
                                                                            <p className="text-xs text-muted-foreground mt-1">{new Date(d.created_date).toLocaleDateString('zh-TW')}</p>
                                                                        </div>
                                                                        <span className="text-lg font-bold text-primary">NT$ {d.amount?.toLocaleString()}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </TabsContent>

                                            <TabsContent value="settings">
                                                <ProfileForm user={user} existingProfile={profile} />
                                            </TabsContent>
                                        </Tabs>
                                    </div>

                                    {/* Milestone Form Dialog */}
                                    <Dialog open={showMilestoneForm} onOpenChange={setShowMilestoneForm}>
                                        <DialogContent className="max-w-lg">
                                            <DialogHeader>
                                                <DialogTitle>{editingMilestone ? '編輯里程碑' : '新增里程碑'}</DialogTitle>
                                            </DialogHeader>
                                            <MilestoneForm
                                                profileId={profile.id}
                                                milestone={editingMilestone}
                                                hasActive={!!activeMilestone}
                                                onDone={() => { setShowMilestoneForm(false); setEditingMilestone(null); }}
                                            />
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                );
}
                                import React, {useState} from 'react';
                                import {base44} from '@/api/base44Client';
                                import {useQuery} from '@tanstack/react-query';
                                import {Link} from 'react-router-dom';
                                import {Sparkles, ArrowLeft, Heart, Star, Trophy, Users} from 'lucide-react';
                                import {Button} from '@/components/ui/button';
                                import {Badge} from '@/components/ui/badge';
                                import {motion} from 'framer-motion';
                                import DonationDialog from '@/components/public/DonationDialog';
                                import MilestonePanel from '@/components/public/MilestonePanel';
                                import TopSupporters from '@/components/public/TopSupporters';

                                // ── Template definitions ──────────────────────────────────────────
                                const TEMPLATES = {
                                    sakura: {
                                    name: '粉櫻少女',
                                bg: 'from-pink-50 via-rose-50 to-fuchsia-50',
                                heroBg: 'from-pink-200 via-rose-100 to-fuchsia-200',
                                accent: 'text-rose-500',
                                accentBg: 'bg-rose-500',
                                accentBorder: 'border-rose-200',
                                accentLight: 'bg-rose-50',
                                progressBar: 'bg-rose-500',
                                cardBorder: 'border-rose-100',
                                cardBg: 'bg-white/80',
                                badge: 'bg-rose-100 text-rose-600 border-rose-200',
                                deco: '🌸',
                                pattern: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f43f5e' fill-opacity='0.04'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10S0 14.5 0 20s4.5 10 10 10 10-4.5 10-10zm10 0c0 5.5 4.5 10 10 10S50 25.5 50 20 45.5 10 40 10s-10 4.5-10 10z'/%3E%3C/g%3E%3C/svg%3E\")",
  },
                                galaxy: {
                                    name: '星辰少年',
                                bg: 'from-violet-50 via-purple-50 to-indigo-50',
                                heroBg: 'from-violet-300 via-purple-200 to-indigo-200',
                                accent: 'text-violet-600',
                                accentBg: 'bg-violet-600',
                                accentBorder: 'border-violet-200',
                                accentLight: 'bg-violet-50',
                                progressBar: 'bg-violet-500',
                                cardBorder: 'border-violet-100',
                                cardBg: 'bg-white/80',
                                badge: 'bg-violet-100 text-violet-700 border-violet-200',
                                deco: '⭐',
                                pattern: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%237c3aed' fill-opacity='0.04'%3E%3Cpath d='M30 5l3.5 10.5H44L35.25 22l3.25 10.5L30 26l-8.5 6.5 3.25-10.5L16 15.5h10.5z'/%3E%3C/g%3E%3C/svg%3E\")",
  },
                                ocean: {
                                    name: '深海公主',
                                bg: 'from-cyan-50 via-sky-50 to-blue-50',
                                heroBg: 'from-cyan-200 via-sky-200 to-blue-200',
                                accent: 'text-cyan-600',
                                accentBg: 'bg-cyan-500',
                                accentBorder: 'border-cyan-200',
                                accentLight: 'bg-cyan-50',
                                progressBar: 'bg-cyan-500',
                                cardBorder: 'border-cyan-100',
                                cardBg: 'bg-white/80',
                                badge: 'bg-cyan-100 text-cyan-700 border-cyan-200',
                                deco: '🌊',
                                pattern: "url(\"data:image/svg+xml,%3Csvg width='80' height='20' viewBox='0 0 80 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10 Q20 0 40 10 Q60 20 80 10' stroke='%230891b2' stroke-opacity='0.06' stroke-width='2' fill='none'/%3E%3C/svg%3E\")",
  },
                                ember: {
                                    name: '烈焰勇者',
                                bg: 'from-orange-50 via-amber-50 to-yellow-50',
                                heroBg: 'from-orange-200 via-amber-200 to-yellow-100',
                                accent: 'text-orange-500',
                                accentBg: 'bg-orange-500',
                                accentBorder: 'border-orange-200',
                                accentLight: 'bg-orange-50',
                                progressBar: 'bg-orange-500',
                                cardBorder: 'border-orange-100',
                                cardBg: 'bg-white/80',
                                badge: 'bg-orange-100 text-orange-600 border-orange-200',
                                deco: '🔥',
                                pattern: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 35 Q15 25 20 15 Q25 25 20 35z' fill='%23f97316' fill-opacity='0.05'/%3E%3C/svg%3E\")",
  },
};

                                function getTemplate(profile) {
  const key = profile?.template || 'sakura';
                                return TEMPLATES[key] || TEMPLATES.sakura;
}

                                export default function VTuberPublicPage() {
  const slug = window.location.pathname.split('/vtuber/')[1];
                                const [donateOpen, setDonateOpen] = useState(false);
                                const [selectedMilestone, setSelectedMilestone] = useState(null);

                                const {data: profiles = [], isLoading } = useQuery({
                                    queryKey: ['vtuber-profile', slug],
    queryFn: () => base44.entities.VTuberProfile.filter({slug}),
                                enabled: !!slug,
  });
                                const profile = profiles[0];
                                const T = getTemplate(profile);

                                const {data: milestones = [] } = useQuery({
                                    queryKey: ['vtuber-milestones', profile?.id],
    queryFn: () => base44.entities.Milestone.filter({vtuber_profile_id: profile.id }, 'order'),
                                enabled: !!profile?.id,
  });

  const activeMilestones = milestones.filter(m => m.status === 'active');
  const completedMilestones = milestones.filter(m => m.status === 'completed');
  const upcomingMilestones = milestones.filter(m => m.status === 'upcoming');

  const openDonate = (milestone) => {
                                    setSelectedMilestone(milestone);
                                setDonateOpen(true);
  };

                                if (isLoading) {
    return (
                                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        <p className="text-muted-foreground text-sm">載入中…</p>
                                    </div>
                                </div>
                                );
  }

                                if (!profile) {
    return (
                                <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-pink-50 to-purple-50">
                                    <span className="text-5xl mb-4">😿</span>
                                    <h1 className="text-2xl font-bold mb-2">找不到此 VTuber</h1>
                                    <Link to="/"><Button variant="outline">回首頁</Button></Link>
                                </div>
                                );
  }

                                return (
                                <div className={`min-h-screen bg-gradient-to-br ${T.bg} font-sans`} style={{ backgroundImage: T.pattern }}>

                                    {/* ── Hero Banner ── */}
                                    <div className={`relative overflow-hidden bg-gradient-to-br ${T.heroBg} min-h-[320px] md:min-h-[380px]`}>
                                        {/* Decorative anime orbs */}
                                        <div className="absolute top-8 right-12 w-40 h-40 rounded-full bg-white/30 blur-2xl" />
                                        <div className="absolute bottom-0 left-8 w-60 h-32 rounded-full bg-white/20 blur-3xl" />
                                        {/* Deco floating emojis */}
                                        <div className="absolute top-10 left-[15%] text-3xl opacity-20 animate-bounce" style={{ animationDelay: '0s' }}>{T.deco}</div>
                                        <div className="absolute top-20 right-[20%] text-2xl opacity-15 animate-bounce" style={{ animationDelay: '0.8s' }}>{T.deco}</div>
                                        <div className="absolute bottom-16 left-[40%] text-xl opacity-10 animate-bounce" style={{ animationDelay: '1.5s' }}>{T.deco}</div>

                                        {profile.banner_url && (
                                            <img src={profile.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40" />
                                        )}

                                        {/* Back button */}
                                        <Link to="/" className="absolute top-5 left-5 z-20">
                                            <Button variant="ghost" size="sm" className="bg-white/60 backdrop-blur-sm hover:bg-white/80 text-gray-700 rounded-xl font-medium">
                                                <ArrowLeft className="w-4 h-4 mr-1" /> 首頁
                                            </Button>
                                        </Link>

                                        {/* Profile info */}
                                        <div className="relative z-10 max-w-3xl mx-auto px-6 pt-16 pb-10 flex flex-col items-center text-center">
                                            {/* Avatar with anime-style ring */}
                                            <motion.div
                                                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                                className="relative mb-4"
                                            >
                                                <div className={`absolute inset-0 rounded-full ${T.accentBg} blur-md opacity-30 scale-110`} />
                                                <div className="relative w-28 h-28 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white">
                                                    {profile.avatar_url ? (
                                                        <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className={`w-full h-full flex items-center justify-center text-4xl font-black ${T.accent}`}>
                                                            {profile.display_name?.[0]}
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Live badge */}
                                                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 ${T.accentBg} text-white text-xs font-bold px-3 py-0.5 rounded-full shadow-lg whitespace-nowrap`}>
                                                    {T.deco} V-Up!
                                                </div>
                                            </motion.div>

                                            <motion.h1
                                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                                className="text-3xl md:text-4xl font-black mt-4 text-gray-800 drop-shadow-sm"
                                            >
                                                {profile.display_name}
                                            </motion.h1>

                                            {profile.bio && (
                                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
                                                    className="text-gray-600 mt-2 max-w-sm text-sm leading-relaxed">
                                                    {profile.bio}
                                                </motion.p>
                                            )}

                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
                                                className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                                                <span className="flex items-center gap-1.5 bg-white/60 backdrop-blur px-3 py-1.5 rounded-full">
                                                    <Star className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" />
                                                    <span className="font-bold text-gray-700">{profile.supporter_count || 0}</span> 支持者
                                                </span>
                                                <span className="flex items-center gap-1.5 bg-white/60 backdrop-blur px-3 py-1.5 rounded-full">
                                                    <Heart className="w-3.5 h-3.5 text-rose-500" fill="currentColor" />
                                                    NT$ <span className="font-bold text-gray-700">{(profile.total_raised || 0).toLocaleString()}</span>
                                                </span>
                                            </motion.div>
                                        </div>
                                    </div>

                                    {/* ── Main Content ── */}
                                    <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">

                                        {/* Active Milestones */}
                                        {activeMilestones.length > 0 && (
                                            <section>
                                                <div className="flex items-center gap-2 mb-5">
                                                    <div className={`w-1 h-6 rounded-full ${T.accentBg}`} />
                                                    <h2 className="text-xl font-black text-gray-800">進行中的目標</h2>
                                                    <Badge className={`${T.badge} border ml-1`}>
                                                        <span className="inline-block w-2 h-2 rounded-full bg-current mr-1 animate-pulse" />
                                                        進行中
                                                    </Badge>
                                                </div>
                                                <div className="space-y-4">
                                                    {activeMilestones.map((m, i) => (
                                                        <motion.div key={m.id}
                                                            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                                                            <MilestonePanel milestone={m} template={T} onDonate={() => openDonate(m)} />
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {activeMilestones.length === 0 && (
                                            <div className={`rounded-2xl border-2 border-dashed ${T.accentBorder} p-10 text-center`}>
                                                <span className="text-4xl">{T.deco}</span>
                                                <p className="text-muted-foreground mt-3">目前沒有進行中的里程碑</p>
                                            </div>
                                        )}

                                        {/* Top Supporters per active milestone */}
                                        {activeMilestones.map(m => (
                                            <TopSupporters key={m.id} milestone={m} template={T} />
                                        ))}

                                        {/* Upcoming */}
                                        {upcomingMilestones.length > 0 && (
                                            <section>
                                                <div className="flex items-center gap-2 mb-5">
                                                    <div className="w-1 h-6 rounded-full bg-gray-300" />
                                                    <h2 className="text-lg font-bold text-gray-700">即將到來</h2>
                                                </div>
                                                <div className="space-y-3">
                                                    {upcomingMilestones.map(m => (
                                                        <div key={m.id} className={`rounded-2xl border ${T.cardBorder} ${T.cardBg} backdrop-blur p-5 flex items-center gap-4 opacity-70`}>
                                                            <span className="text-3xl">{m.icon || '🌟'}</span>
                                                            <div className="flex-1">
                                                                <h3 className="font-bold text-gray-700">{m.title}</h3>
                                                                <p className="text-sm text-muted-foreground">目標：NT$ {m.target_amount?.toLocaleString()}</p>
                                                            </div>
                                                            <Badge variant="outline" className="text-gray-400 border-gray-200">敬請期待</Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Completed Milestones */}
                                        {completedMilestones.length > 0 && (
                                            <section>
                                                <div className="flex items-center gap-2 mb-5">
                                                    <div className="w-1 h-6 rounded-full bg-emerald-400" />
                                                    <h2 className="text-lg font-bold text-gray-700">已達成里程碑</h2>
                                                    <Trophy className="w-4 h-4 text-yellow-500" />
                                                </div>
                                                <div className="space-y-3">
                                                    {completedMilestones.map(m => (
                                                        <div key={m.id} className="rounded-2xl border border-emerald-100 bg-white/80 backdrop-blur p-5">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-3xl">{m.icon || '🏆'}</span>
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <h3 className="font-bold text-gray-800">{m.title}</h3>
                                                                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs border">完成</Badge>
                                                                    </div>
                                                                    <p className="text-sm text-muted-foreground mt-0.5">達成 NT$ {m.target_amount?.toLocaleString()}</p>
                                                                </div>
                                                            </div>
                                                            {m.thank_you_message && (
                                                                <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-800">
                                                                    💌 {m.thank_you_message}
                                                                </div>
                                                            )}
                                                            <TopSupporters milestone={m} template={T} compact />
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                    </div>

                                    {/* Donate Dialog */}
                                    <DonationDialog
                                        open={donateOpen}
                                        onOpenChange={setDonateOpen}
                                        milestone={selectedMilestone}
                                        profile={profile}
                                        template={T}
                                    />
                                </div>
                                );
}export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}import {Toaster} from "@/components/ui/toaster"
                                import {QueryClientProvider} from '@tanstack/react-query'
                                import {queryClientInstance} from '@/lib/query-client'
                                import {BrowserRouter as Router, Route, Routes} from 'react-router-dom';
                                import PageNotFound from './lib/PageNotFound';
                                import {AuthProvider, useAuth} from '@/lib/AuthContext';
                                import UserNotRegisteredError from '@/components/UserNotRegisteredError';
                                import Home from './pages/Home';
                                import VTuberDashboard from './pages/VTuberDashboard';
                                import VTuberPublicPage from './pages/VTuberPublicPage';
                                import MyBadges from './pages/MyBadges';
                                import BadgeShare from './pages/BadgeShare';

const AuthenticatedApp = () => {
  const {isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin} = useAuth();

                                // Show loading spinner while checking app public settings or auth
                                if (isLoadingPublicSettings || isLoadingAuth) {
    return (
                                <div className="fixed inset-0 flex items-center justify-center">
                                    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
                                </div>
                                );
  }

                                // Handle authentication errors
                                if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
                                    // Redirect to login automatically
                                    navigateToLogin();
                                return null;
    }
  }

                                // Render the main app
                                return (
                                <Routes>
                                    <Route path="/" element={<Home />} />
                                    <Route path="/dashboard" element={<VTuberDashboard />} />
                                    <Route path="/vtuber/:slug" element={<VTuberPublicPage />} />
                                    <Route path="/my-badges" element={<MyBadges />} />
                                    <Route path="/badge/:code" element={<BadgeShare />} />
                                    <Route path="*" element={<PageNotFound />} />
                                </Routes>
                                );
};


                                function App() {

  return (
                                <AuthProvider>
                                    <QueryClientProvider client={queryClientInstance}>
                                        <Router>
                                            <AuthenticatedApp />
                                        </Router>
                                        <Toaster />
                                    </QueryClientProvider>
                                </AuthProvider>
                                )
}

                                export default App
                                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;600;700;900&display=swap');

                                @tailwind base;
                                @tailwind components;
                                @tailwind utilities;

                                @layer base {
  :root {
                                    --font - sans: 'Noto Sans TC', sans-serif;
                                --background: 260 40% 98%;
                                --foreground: 260 30% 10%;
                                --card: 0 0% 100%;
                                --card-foreground: 260 30% 10%;
                                --popover: 0 0% 100%;
                                --popover-foreground: 260 30% 10%;
                                --primary: 265 85% 58%;
                                --primary-foreground: 0 0% 100%;
                                --secondary: 260 40% 95%;
                                --secondary-foreground: 260 30% 20%;
                                --muted: 260 30% 94%;
                                --muted-foreground: 260 15% 50%;
                                --accent: 328 85% 55%;
                                --accent-foreground: 0 0% 100%;
                                --destructive: 0 84.2% 60.2%;
                                --destructive-foreground: 0 0% 98%;
                                --border: 260 25% 88%;
                                --input: 260 25% 88%;
                                --ring: 265 85% 58%;
                                --chart-1: 270 95% 65%;
                                --chart-2: 328 90% 58%;
                                --chart-3: 185 90% 50%;
                                --chart-4: 45 95% 55%;
                                --chart-5: 150 70% 50%;
                                --radius: 0.75rem;
                                --sidebar-background: 258 35% 7%;
                                --sidebar-foreground: 260 10% 95%;
                                --sidebar-primary: 270 95% 65%;
                                --sidebar-primary-foreground: 0 0% 100%;
                                --sidebar-accent: 258 25% 16%;
                                --sidebar-accent-foreground: 260 10% 85%;
                                --sidebar-border: 258 25% 18%;
                                --sidebar-ring: 270 95% 65%;
  }

                                .dark {
                                    --background: 258 35% 7%;
                                --foreground: 260 10% 95%;
                                --card: 258 30% 11%;
                                --card-foreground: 260 10% 95%;
                                --popover: 258 30% 11%;
                                --popover-foreground: 260 10% 95%;
                                --primary: 270 95% 65%;
                                --primary-foreground: 0 0% 100%;
                                --secondary: 258 25% 16%;
                                --secondary-foreground: 260 10% 85%;
                                --muted: 258 25% 14%;
                                --muted-foreground: 260 10% 55%;
                                --accent: 328 90% 58%;
                                --accent-foreground: 0 0% 100%;
                                --destructive: 0 62.8% 30.6%;
                                --destructive-foreground: 0 0% 98%;
                                --border: 258 25% 18%;
                                --input: 258 25% 18%;
                                --ring: 270 95% 65%;
                                --chart-1: 270 95% 65%;
                                --chart-2: 328 90% 58%;
                                --chart-3: 185 90% 50%;
                                --chart-4: 45 95% 55%;
                                --chart-5: 150 70% 50%;
                                --sidebar-background: 258 35% 7%;
                                --sidebar-foreground: 260 30% 10%;
                                --sidebar-primary: 265 85% 58%;
                                --sidebar-primary-foreground: 0 0% 100%;
                                --sidebar-accent: 260 40% 95%;
                                --sidebar-accent-foreground: 260 30% 20%;
                                --sidebar-border: 260 25% 88%;
                                --sidebar-ring: 265 85% 58%;
  }
}



                                @layer base {
  * {
    @apply border-border outline-ring/50;
  }

                                body {
                                    @apply bg-background text-foreground;
  }
}import React from 'react'
                                import ReactDOM from 'react-dom/client'
                                import App from '@/App.jsx'
                                import '@/index.css'

                                ReactDOM.createRoot(document.getElementById('root')).render(
                                <App />
                                )
                                #env
                                .env
                                .env.*

                                # Logs
                                /logs
                                *.log
                                npm-debug.log*
                                yarn-debug.log*
                                yarn-error.log*
                                pnpm-debug.log*
                                lerna-debug.log*

                                node_modules
                                dist
                                dist-ssr
                                *.local

                                # Editor directories and files
                                .vscode/*
                                !.vscode/extensions.json
                                .idea
                                .DS_Store
                                *.suo
                                *.ntvs*
                                *.njsproj
                                *.sln
                                *.sw?

                                .env
                                .vite
                                {
                                    "$schema": "https://ui.shadcn.com/schema.json",
                                "style": "new-york",
                                "rsc": false,
                                "tsx": false,
                                "tailwind": {
                                    "config": "tailwind.config.js",
                                "css": "src/index.css",
                                "baseColor": "neutral",
                                "cssVariables": true,
                                "prefix": ""
  },
                                "aliases": {
                                    "components": "@/components",
                                "utils": "@/lib/utils",
                                "ui": "@/components/ui",
                                "lib": "@/lib",
                                "hooks": "@/hooks"
  },
                                "iconLibrary": "lucide"
}import globals from "globals";
                                import pluginJs from "@eslint/js";
                                import pluginReact from "eslint-plugin-react";
                                import pluginReactHooks from "eslint-plugin-react-hooks";
                                import pluginUnusedImports from "eslint-plugin-unused-imports";

                                export default [
                                {
                                    files: [
                                "src/components/**/*.{js, mjs, cjs, jsx}",
                                "src/pages/**/*.{js, mjs, cjs, jsx}",
                                "src/Layout.jsx",
                                ],
                                ignores: ["src/lib/**/*", "src/components/ui/**/*"],
                                ...pluginJs.configs.recommended,
                                ...pluginReact.configs.flat.recommended,
                                languageOptions: {
                                    globals: globals.browser,
                                parserOptions: {
                                    ecmaVersion: 2022,
                                sourceType: "module",
                                ecmaFeatures: {
                                    jsx: true,
        },
      },
    },
                                settings: {
                                    react: {
                                    version: "detect",
      },
    },
                                plugins: {
                                    react: pluginReact,
                                "react-hooks": pluginReactHooks,
                                "unused-imports": pluginUnusedImports,
    },
                                rules: {
                                    "no-unused-vars": "off",
                                "react/jsx-uses-vars": "error",
                                "react/jsx-uses-react": "error",
                                "unused-imports/no-unused-imports": "error",
                                "unused-imports/no-unused-vars": [
                                "warn",
                                {
                                    vars: "all",
                                varsIgnorePattern: "^_",
                                args: "after-used",
                                argsIgnorePattern: "^_",
        },
                                ],
                                "react/prop-types": "off",
                                "react/react-in-jsx-scope": "off",
                                "react/no-unknown-property": [
                                "error",
                                {ignore: ["cmdk-input-wrapper", "toast-close"] },
                                ],
                                "react-hooks/rules-of-hooks": "error",
    },
  },
                                ];
                                <!doctype html>
                                <html lang="en">
                                    <head>
                                        <meta charset="UTF-8" />
                                        <link rel="icon" type="image/svg+xml" href="https://base44.com/logo_v2.svg" />
                                        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                                        <link rel="manifest" href="/manifest.json" />
                                        <title>Base44 APP</title>
                                    </head>
                                    <body>
                                        <div id="root"></div>
                                        <script type="module" src="/src/main.jsx"></script>
                                    </body>
                                </html>
                                {
                                    "compilerOptions": {
                                    "baseUrl": ".",
                                "paths": {
                                    "@/*": ["./src/*"]
    },
                                "jsx": "react-jsx",
                                "module": "esnext",
                                "moduleResolution": "bundler",
                                "lib": ["esnext", "dom"],
                                "target": "esnext",
                                "checkJs": true,
                                "skipLibCheck": true,
                                "allowSyntheticDefaultImports": true,
                                "esModuleInterop": true,
                                "resolveJsonModule": true,
                                "types": []
  },
                                "include": ["src/components/**/*.js", "src/pages/**/*.jsx", "src/Layout.jsx"],
                                "exclude": ["node_modules", "dist", "src/vite-plugins", "src/components/ui", "src/api", "src/lib"]
} {
                                    "name": "base44-app",
                                "private": true,
                                "version": "0.0.0",
                                "type": "module",
                                "scripts": {
                                    "dev": "vite",
                                "build": "vite build",
                                "lint": "eslint . --quiet",
                                "lint:fix": "eslint . --fix",
                                "typecheck": "tsc -p ./jsconfig.json",
                                "preview": "vite preview"
  },
                                "dependencies": {
                                    "@base44/sdk": "^0.8.0",
                                "@base44/vite-plugin": "^1.0.0",
                                "@hello-pangea/dnd": "^17.0.0",
                                "@hookform/resolvers": "^4.1.2",
                                "@radix-ui/react-accordion": "^1.2.3",
                                "@radix-ui/react-alert-dialog": "^1.1.6",
                                "@radix-ui/react-aspect-ratio": "^1.1.2",
                                "@radix-ui/react-avatar": "^1.1.3",
                                "@radix-ui/react-checkbox": "^1.1.4",
                                "@radix-ui/react-collapsible": "^1.1.3",
                                "@radix-ui/react-context-menu": "^2.2.6",
                                "@radix-ui/react-dialog": "^1.1.6",
                                "@radix-ui/react-dropdown-menu": "^2.1.6",
                                "@radix-ui/react-hover-card": "^1.1.6",
                                "@radix-ui/react-label": "^2.1.2",
                                "@radix-ui/react-menubar": "^1.1.6",
                                "@radix-ui/react-navigation-menu": "^1.2.5",
                                "@radix-ui/react-popover": "^1.1.6",
                                "@radix-ui/react-progress": "^1.1.2",
                                "@radix-ui/react-radio-group": "^1.2.3",
                                "@radix-ui/react-scroll-area": "^1.2.3",
                                "@radix-ui/react-select": "^2.1.6",
                                "@radix-ui/react-separator": "^1.1.2",
                                "@radix-ui/react-slider": "^1.2.3",
                                "@radix-ui/react-slot": "^1.1.2",
                                "@radix-ui/react-switch": "^1.1.3",
                                "@radix-ui/react-tabs": "^1.1.3",
                                "@radix-ui/react-toast": "^1.2.2",
                                "@radix-ui/react-toggle": "^1.1.2",
                                "@radix-ui/react-toggle-group": "^1.1.2",
                                "@radix-ui/react-tooltip": "^1.1.8",
                                "@stripe/react-stripe-js": "^3.0.0",
                                "@stripe/stripe-js": "^5.2.0",
                                "@tanstack/react-query": "^5.84.1",
                                "canvas-confetti": "^1.9.4",
                                "class-variance-authority": "^0.7.1",
                                "clsx": "^2.1.1",
                                "cmdk": "^1.0.0",
                                "date-fns": "^3.6.0",
                                "embla-carousel-react": "^8.5.2",
                                "framer-motion": "^11.16.4",
                                "html2canvas": "^1.4.1",
                                "input-otp": "^1.4.2",
                                "jspdf": "^4.0.0",
                                "lodash": "^4.17.21",
                                "lucide-react": "^0.475.0",
                                "moment": "^2.30.1",
                                "next-themes": "^0.4.4",
                                "react": "^18.2.0",
                                "react-day-picker": "^8.10.1",
                                "react-dom": "^18.2.0",
                                "react-hook-form": "^7.54.2",
                                "react-hot-toast": "^2.6.0",
                                "react-leaflet": "^4.2.1",
                                "react-markdown": "^9.0.1",
                                "react-quill": "^2.0.0",
                                "react-resizable-panels": "^2.1.7",
                                "react-router-dom": "^6.26.0",
                                "recharts": "^2.15.4",
                                "sonner": "^2.0.1",
                                "tailwind-merge": "^3.0.2",
                                "tailwindcss-animate": "^1.0.7",
                                "three": "^0.171.0",
                                "vaul": "^1.1.2",
                                "zod": "^3.24.2"
  },
                                "devDependencies": {
                                    "@eslint/js": "^9.19.0",
                                "@types/node": "^22.13.5",
                                "@types/react": "^18.2.66",
                                "@types/react-dom": "^18.2.22",
                                "@vitejs/plugin-react": "^4.3.4",
                                "autoprefixer": "^10.4.20",
                                "baseline-browser-mapping": "^2.8.32",
                                "eslint": "^9.19.0",
                                "eslint-plugin-react": "^7.37.4",
                                "eslint-plugin-react-hooks": "^5.0.0",
                                "eslint-plugin-react-refresh": "^0.4.18",
                                "eslint-plugin-unused-imports": "^4.3.0",
                                "globals": "^15.14.0",
                                "postcss": "^8.5.3",
                                "tailwindcss": "^3.4.17",
                                "typescript": "^5.8.2",
                                "vite": "^6.1.0"
  }
}export default {
                                    plugins: {
                                    tailwindcss: { },
                                autoprefixer: { },
  },
}
                                **Welcome to your Base44 project**

                                **About**

                                View and Edit  your app on [Base44.com](http://Base44.com)

                                This project contains everything you need to run your app locally.

                                **Edit the code in your local development environment**

                                Any change pushed to the repo will also be reflected in the Base44 Builder.

                                **Prerequisites:**

                                1. Clone the repository using the project's Git URL
                                2. Navigate to the project directory
                                3. Install dependencies: `npm install`
                                4. Create an `.env.local` file and set the right environment variables

                                ```
                                VITE_BASE44_APP_ID=your_app_id
                                VITE_BASE44_APP_BASE_URL=your_backend_url

                                e.g.
                                VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
                                VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
                                ```

                                Run the app: `npm run dev`

                                **Publish your changes**

                                Open [Base44.com](http://Base44.com) and click on Publish.

                                **Docs & Support**

                                Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

                                Support: [https://app.base44.com/support](https://app.base44.com/support)
/** @type {import('tailwindcss').Config} */
                                module.exports = {
                                    darkMode: ["class"],
                                content: ["./index.html", "./src/**/*.{ts, tsx, js, jsx}"],
                                theme: {
                                    extend: {
                                    fontFamily: {
                                    sans: ['var(--font-sans)', 'sans-serif'],
  		},
                                borderRadius: {
                                    lg: 'var(--radius)',
                                md: 'calc(var(--radius) - 2px)',
                                sm: 'calc(var(--radius) - 4px)'
  		},
                                colors: {
                                    background: 'hsl(var(--background))',
                                foreground: 'hsl(var(--foreground))',
                                card: {
                                    DEFAULT: 'hsl(var(--card))',
                                foreground: 'hsl(var(--card-foreground))'
  			},
                                popover: {
                                    DEFAULT: 'hsl(var(--popover))',
                                foreground: 'hsl(var(--popover-foreground))'
  			},
                                primary: {
                                    DEFAULT: 'hsl(var(--primary))',
                                foreground: 'hsl(var(--primary-foreground))'
  			},
                                secondary: {
                                    DEFAULT: 'hsl(var(--secondary))',
                                foreground: 'hsl(var(--secondary-foreground))'
  			},
                                muted: {
                                    DEFAULT: 'hsl(var(--muted))',
                                foreground: 'hsl(var(--muted-foreground))'
  			},
                                accent: {
                                    DEFAULT: 'hsl(var(--accent))',
                                foreground: 'hsl(var(--accent-foreground))'
  			},
                                destructive: {
                                    DEFAULT: 'hsl(var(--destructive))',
                                foreground: 'hsl(var(--destructive-foreground))'
  			},
                                border: 'hsl(var(--border))',
                                input: 'hsl(var(--input))',
                                ring: 'hsl(var(--ring))',
                                chart: {
                                    '1': 'hsl(var(--chart-1))',
                                '2': 'hsl(var(--chart-2))',
                                '3': 'hsl(var(--chart-3))',
                                '4': 'hsl(var(--chart-4))',
                                '5': 'hsl(var(--chart-5))'
  			},
                                sidebar: {
                                    DEFAULT: 'hsl(var(--sidebar-background))',
                                foreground: 'hsl(var(--sidebar-foreground))',
                                primary: 'hsl(var(--sidebar-primary))',
                                'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
                                accent: 'hsl(var(--sidebar-accent))',
                                'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
                                border: 'hsl(var(--sidebar-border))',
                                ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
                                keyframes: {
                                    'accordion-down': {
                                    from: {
                                    height: '0'
  				},
                                to: {
                                    height: 'var(--radix-accordion-content-height)'
  				}
  			},
                                'accordion-up': {
                                    from: {
                                    height: 'var(--radix-accordion-content-height)'
  				},
                                to: {
                                    height: '0'
  				}
  			}
  		},
                                animation: {
                                    'accordion-down': 'accordion-down 0.2s ease-out',
                                'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
                                safelist: [
                                'from-pink-50','via-rose-50','to-fuchsia-50','from-pink-200','via-rose-100','to-fuchsia-200',
                                'bg-rose-500','bg-rose-50','bg-rose-100','border-rose-200','border-rose-100',
                                'text-rose-500','text-rose-600','text-rose-700',
                                'from-violet-50','via-purple-50','to-indigo-50','from-violet-300','via-purple-200','to-indigo-200',
                                'bg-violet-600','bg-violet-500','bg-violet-50','bg-violet-100','border-violet-200','border-violet-100',
                                'text-violet-600','text-violet-700',
                                'from-cyan-50','via-sky-50','to-blue-50','from-cyan-200','via-sky-200','to-blue-200',
                                'bg-cyan-500','bg-cyan-50','bg-cyan-100','border-cyan-200','border-cyan-100',
                                'text-cyan-600','text-cyan-700',
                                'from-orange-50','via-amber-50','to-yellow-50','from-orange-200','via-amber-200','to-yellow-100',
                                'bg-orange-500','bg-orange-50','bg-orange-100','border-orange-200','border-orange-100',
                                'text-orange-500','text-orange-600',
                                ],
                                plugins: [require("tailwindcss-animate")],
}import base44 from "@base44/vite-plugin"
                                import react from '@vitejs/plugin-react'
                                import {defineConfig} from 'vite'

                                // https://vite.dev/config/
                                export default defineConfig({
                                    logLevel: 'error', // Suppress warnings, only show errors
                                plugins: [
                                base44({
                                    // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
                                    // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
                                    legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
                                hmrNotifier: true,
                                navigationNotifier: true,
                                analyticsTracker: true,
                                visualEditAgent: true
    }),
                                react(),
                                ]
});