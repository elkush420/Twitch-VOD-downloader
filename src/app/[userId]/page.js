'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/auth-context';
import awsExports from '../../../aws-exports';

import Hls from 'hls.js';

import { listStreamerVideos } from '../../utils/queries'

export default function Page() {
  const params = useParams();
  const userId = params.userId;


  const { user, tokens } = useAuth();
  const [data, setData] = useState([]);

  useEffect(() => {

    if (!tokens?.access_token) return;

    async function fetchData() {
      try {
        const response = await fetch(awsExports.aws_appsync_graphqlEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokens.access_token}`,
          },
          body: JSON.stringify({ query: listStreamerVideos, variables: { userId } }),
        });

        const result = await response.json();
        console.log('GraphQL result:', result);
        setData(result.data.listStreamersVideos.items);
      } catch (err) {
        console.error('Error fetching data', err);
      }
    }

    fetchData();
  }, [userId, tokens]);

  return (
    <>
        <p style={{ marginBottom: 20 }}>Listing videos for streamer: {userId}</p>

        {data ? (
          data.length > 0 ? (
            data.map((video) => (
              <VideoRow key={video.videoId} video={video} />
            ))
          ) : (
            <p>No videos available.</p>
          )
        ) : (
          <p>Loading videos...</p>
        )}
    </>
  );
}


function VideoRow({ video }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (video.videoProcessingStatus === 'RESTRICTED_VOD' || !video.processedManifestUrl) {
      console.log(`Skipping video ${video.videoId}`);
      return;
    }

    const videoEl = videoRef.current;
    if (!videoEl) {
      console.warn('Video element not ready');
      return;
    }

    let hls;

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log('HLS media attached, loading manifest');
        hls.loadSource(video.processedManifestUrl);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
      });
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = video.processedManifestUrl;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [video.videoId, video.videoProcessingStatus, video.processedManifestUrl]);

  return (
    <div style={{ marginBottom: 20 }}>
      <p>Video ID: {video.videoId}</p>
      <p>Published: {new Date(video.videoPublishedTime).toLocaleString()}</p>
      <p>Status: {video.videoProcessingStatus}</p>

      {video.videoProcessingStatus === 'RESTRICTED_VOD' || !video.processedManifestUrl ? (
        <p style={{ color: 'red' }}>This video is restricted or unavailable.</p>
      ) : (
        <video
          ref={videoRef}
          controls
          width="640"
          height="360"
          style={{ border: '1px solid #ccc' }}
        />
      )}
    </div>
  );
}