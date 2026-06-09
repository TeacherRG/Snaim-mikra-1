const formatTime = (seconds) => {
  const s = Math.max(0, Math.floor(seconds || 0));
  const minutes = String(Math.floor(s / 60)).padStart(2, '0');
  const secs = String(s % 60).padStart(2, '0');
  return `${minutes}:${secs}`;
};

export const createAudioController = ({
  audio,
  playPauseBtn,
  timeline,
  currentTimeLabel,
  totalTimeLabel,
  speedSelect,
  playbackRates,
}) => {
  const setPlayingState = () => {
    playPauseBtn.textContent = audio.paused ? 'נגן' : 'השהה';
  };

  playbackRates.forEach((rate) => {
    const option = document.createElement('option');
    option.value = String(rate);
    option.textContent = `${rate.toFixed(rate % 1 ? 2 : 1)}x`;
    speedSelect.append(option);
  });

  speedSelect.value = String(playbackRates[0]);
  audio.playbackRate = playbackRates[0];
  audio.preservesPitch = true;
  if ('webkitPreservesPitch' in audio) {
    audio.webkitPreservesPitch = true;
  }

  const handlePlayError = (err) => {
    if (err?.name === 'NotAllowedError') {
      // Browser autoplay policy blocked playback; notify the UI.
      playPauseBtn.dispatchEvent(new CustomEvent('playblocked'));
    } else {
      throw err;
    }
  };

  playPauseBtn.addEventListener('click', async () => {
    if (audio.paused) {
      await audio.play().catch(handlePlayError);
    } else {
      audio.pause();
    }
    setPlayingState();
  });

  audio.addEventListener('play', setPlayingState);
  audio.addEventListener('pause', setPlayingState);

  speedSelect.addEventListener('change', () => {
    audio.playbackRate = Number(speedSelect.value);
  });

  timeline.addEventListener('input', () => {
    const value = Number(timeline.value);
    audio.currentTime = value;
  });

  audio.addEventListener('timeupdate', () => {
    timeline.value = String(audio.currentTime);
    currentTimeLabel.textContent = formatTime(audio.currentTime);
  });

  audio.addEventListener('loadedmetadata', () => {
    timeline.max = String(audio.duration || 0);
    totalTimeLabel.textContent = formatTime(audio.duration);
  });

  return {
    formatTime,
    setDuration: (durationSec) => {
      timeline.max = String(durationSec);
      totalTimeLabel.textContent = formatTime(durationSec);
    },
    seekAndPlay: async (timeSec) => {
      audio.currentTime = Math.max(0, timeSec);
      timeline.value = String(audio.currentTime);
      if (audio.paused) {
        await audio.play().catch(handlePlayError);
      }
    },
    onTimeUpdate: (handler) => {
      audio.addEventListener('timeupdate', () => handler(audio.currentTime));
    },
    getDuration: () => audio.duration,
  };
};
