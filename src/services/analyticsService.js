import { supabase } from '../lib/supabase';

// API base — 개발: Vite proxy, 프로덕션: Vercel serverless
const API_BASE = import.meta.env.DEV ? '' : '';

// ============================================
// 인게이지먼트 계산 헬퍼 (export)
// ============================================
export function calcEngagementRate(video) {
  const views = Number(video.views) || 0;
  if (views === 0) return 0;
  return (((Number(video.likes) || 0) + (Number(video.comments) || 0)) / views) * 100;
}

export function calcLikeRatio(video) {
  const views = Number(video.views) || 0;
  if (views === 0) return 0;
  return ((Number(video.likes) || 0) / views) * 100;
}

export function calcCommentRatio(video) {
  const views = Number(video.views) || 0;
  if (views === 0) return 0;
  return ((Number(video.comments) || 0) / views) * 100;
}

export function calcChannelEngagement(videos) {
  if (!videos || videos.length === 0) return 0;
  const rates = videos.map(calcEngagementRate);
  return rates.reduce((a, b) => a + b, 0) / rates.length;
}

export function formatDuration(iso) {
  if (!iso) return '';
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return iso;
  const h = m[1] ? `${m[1]}:` : '';
  const min = (m[2] || '0').padStart(h ? 2 : 1, '0');
  const sec = (m[3] || '0').padStart(2, '0');
  return `${h}${min}:${sec}`;
}

export const analyticsService = {
  // ============================================
  // 기존 메서드 (하위 호환 유지)
  // ============================================
  async getOverview() {
    const { data, error } = await supabase.from('sns_overview').select('*');
    if (error) throw error;
    return data;
  },
  async getGrowth() {
    const { data, error } = await supabase.from('sns_growth').select('*').order('id');
    if (error) throw error;
    return data;
  },
  async getEngagement() {
    const { data, error } = await supabase.from('sns_engagement').select('*').order('id');
    if (error) throw error;
    return data;
  },
  async getRecentContents() {
    const { data, error } = await supabase.from('recent_contents').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data;
  },
  async getInsights() {
    const { data, error } = await supabase.from('ai_insights').select('*').order('id');
    if (error) throw error;
    return data;
  },

  // ============================================
  // 채널 관리 (Supabase CRUD)
  // ============================================
  async getChannels() {
    const { data, error } = await supabase
      .from('sns_channels')
      .select('*')
      .order('is_own', { ascending: false })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async addChannel(channelId, platform = 'youtube', isOwn = false) {
    // 1. YouTube API로 채널 정보 조회
    const res = await fetch(`${API_BASE}/api/sns/youtube-channel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `채널 조회 실패: ${res.status}`);
    }
    const { channel } = await res.json();

    // 2. Supabase에 upsert
    const { data, error } = await supabase
      .from('sns_channels')
      .upsert({
        platform,
        channel_id: channel.id,
        name: channel.name,
        thumbnail: channel.thumbnail,
        handle: channel.handle,
        is_own: isOwn,
      }, { onConflict: 'platform,channel_id' })
      .select()
      .single();
    if (error) throw error;

    // 3. 초기 통계 스냅샷 저장
    await this.saveChannelStats(channel);

    // 4. 초기 영상 데이터 가져오기
    let videos = [];
    try {
      videos = await this.fetchChannelVideos(channel.id, 12);
    } catch (e) {
      console.error('초기 영상 fetch 실패:', e);
    }

    return { ...data, ...channel, initialVideos: videos };
  },

  async removeChannel(id) {
    // 먼저 channel_id 조회
    const { data: ch } = await supabase
      .from('sns_channels')
      .select('channel_id, platform')
      .eq('id', id)
      .single();

    // 관련 데이터 정리
    if (ch) {
      await supabase.from('sns_videos').delete()
        .eq('channel_id', ch.channel_id).eq('platform', ch.platform);
      await supabase.from('sns_channel_stats').delete()
        .eq('channel_id', ch.channel_id).eq('platform', ch.platform);
    }

    // 채널 삭제
    const { error } = await supabase.from('sns_channels').delete().eq('id', id);
    if (error) throw error;
  },

  // ============================================
  // YouTube 데이터 가져오기
  // ============================================
  async fetchChannelStats(channelId) {
    const res = await fetch(`${API_BASE}/api/sns/youtube-channel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || '채널 통계 조회 실패');
    }
    const { channel } = await res.json();
    await this.saveChannelStats(channel);
    return channel;
  },

  async saveChannelStats(channel) {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('sns_channel_stats')
      .upsert({
        channel_id: channel.id,
        platform: 'youtube',
        subscribers: channel.subscribers,
        total_views: channel.totalViews,
        video_count: channel.videoCount,
        fetched_date: today,
      }, { onConflict: 'channel_id,platform,fetched_date' });
    if (error) console.error('채널 통계 저장 실패:', error);
  },

  async getLatestChannelStats(channelIds) {
    if (!channelIds || channelIds.length === 0) return {};
    // 각 채널의 가장 최근 stats 행을 가져옴
    const { data, error } = await supabase
      .from('sns_channel_stats')
      .select('*')
      .in('channel_id', channelIds)
      .order('fetched_date', { ascending: false });
    if (error) throw error;

    // 채널별로 가장 최근 1행만 취함
    const statsMap = {};
    (data || []).forEach((row) => {
      if (!statsMap[row.channel_id]) {
        statsMap[row.channel_id] = {
          subscribers: row.subscribers,
          totalViews: row.total_views,
          videoCount: row.video_count,
        };
      }
    });
    return statsMap;
  },

  async getChannelStatsHistory(channelId, days = 30) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const { data, error } = await supabase
      .from('sns_channel_stats')
      .select('*')
      .eq('channel_id', channelId)
      .gte('fetched_date', fromDate.toISOString().split('T')[0])
      .order('fetched_date', { ascending: true });
    if (error) throw error;
    return data;
  },

  async fetchChannelVideos(channelId, maxResults = 12) {
    const res = await fetch(`${API_BASE}/api/sns/youtube-videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId, maxResults }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || '영상 조회 실패');
    }
    const { videos } = await res.json();

    // Supabase에 캐시 저장
    if (videos.length > 0) {
      const rows = videos.map((v) => ({
        channel_id: channelId,
        platform: 'youtube',
        video_id: v.videoId,
        title: v.title,
        thumbnail: v.thumbnail,
        description: v.description,
        views: v.views,
        likes: v.likes,
        comments: v.comments,
        published_at: v.publishedAt,
      }));
      const { error } = await supabase
        .from('sns_videos')
        .upsert(rows, { onConflict: 'platform,video_id' });
      if (error) console.error('영상 캐시 저장 실패:', error);
    }

    return videos;
  },

  async getCachedVideos(channelIds = []) {
    let query = supabase
      .from('sns_videos')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(50);
    if (channelIds.length > 0) {
      query = query.in('channel_id', channelIds);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // ============================================
  // 업계 모니터링
  // ============================================
  async searchYouTube(query, maxResults = 10, type = 'video') {
    const res = await fetch(`${API_BASE}/api/sns/youtube-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, maxResults, type }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'YouTube 검색 실패');
    }
    return await res.json();
  },

  async getMonitoringKeywords() {
    const { data, error } = await supabase
      .from('sns_monitoring_keywords')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async addMonitoringKeyword(keyword, platform = 'youtube') {
    const { data, error } = await supabase
      .from('sns_monitoring_keywords')
      .insert({ keyword, platform })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeMonitoringKeyword(id) {
    const { error } = await supabase
      .from('sns_monitoring_keywords')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ============================================
  // AI 인사이트
  // ============================================
  async generateSnsInsights(channels, videos, competitors = []) {
    const res = await fetch(`${API_BASE}/api/sns/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channels, videos, competitors }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'AI 인사이트 생성 실패');
    }
    return await res.json();
  },

  async saveAiInsight(insightText, analyzedCount) {
    const { error } = await supabase
      .from('sns_ai_insights')
      .insert({ insight_text: insightText, analyzed_count: analyzedCount });
    if (error) console.error('AI 인사이트 저장 실패:', error);
  },

  async getLatestAiInsight() {
    const { data, error } = await supabase
      .from('sns_ai_insights')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // ============================================
  // 일괄 갱신
  // ============================================
  async refreshAllChannelData(channels) {
    const results = await Promise.allSettled(
      channels.map(async (ch) => {
        // stats와 videos를 독립적으로 fetch → 하나 실패해도 다른 것은 살림
        const [statsResult, videosResult] = await Promise.allSettled([
          this.fetchChannelStats(ch.channel_id),
          this.fetchChannelVideos(ch.channel_id, 12),
        ]);
        return {
          channelId: ch.channel_id,
          stats: statsResult.status === 'fulfilled' ? statsResult.value : null,
          videos: videosResult.status === 'fulfilled' ? videosResult.value : [],
        };
      })
    );
    return results;
  },
};
