import {
    AsbPlayerToVideoCommandV2,
    CopySubtitleMessage,
    CurrentTimeToVideoMessage,
    HiddenMessage,
    LoadSubtitlesMessage,
    MobileOverlayToVideoCommand,
    OffsetToVideoMessage,
    PlaybackRateToVideoMessage,
    PlayMode,
    PlayModeMessage,
    ToggleSubtitlesMessage,
} from '@project/common';
import { useCallback, useEffect, useRef } from 'react';
import { useMobileVideoOverlayModel } from '../hooks/use-mobile-video-overlay-model';
import { useMobileVideoOverlayLocation } from '../hooks/use-mobile-video-overlay-location';
import { SettingsProvider } from '@project/common/settings';
import { ExtensionSettingsStorage } from '../../services/extension-settings-storage';
import MobileVideoOverlay from '@project/common/components/MobileVideoOverlay';
import { useI18n } from '../hooks/use-i18n';

const settings = new SettingsProvider(new ExtensionSettingsStorage());
const params = new URLSearchParams(location.search);
const anchor = params.get('anchor') as 'top' | 'bottom';
const tooltipsEnabled = params.get('tooltips') === 'true';
const containerHeight = 48;
const scrollBufferHeight = 100;

const MobileVideoOverlayUi = () => {
    const location = useMobileVideoOverlayLocation();
    const hiddenRef = useRef<boolean>(false);

    const handleMineSubtitle = useCallback(async () => {
        if (!location) {
            return;
        }

        const command: AsbPlayerToVideoCommandV2<CopySubtitleMessage> = {
            sender: 'asbplayerv2',
            message: {
                command: 'copy-subtitle',
                postMineAction: await settings.getSingle('clickToMineDefaultAction'),
            },
            tabId: location.tabId,
            src: location.src,
        };
        chrome.runtime.sendMessage(command);
    }, [location]);

    const handleLoadSubtitles = useCallback(() => {
        if (!location) {
            return;
        }

        const command: AsbPlayerToVideoCommandV2<LoadSubtitlesMessage> = {
            sender: 'asbplayerv2',
            message: { command: 'load-subtitles' },
            tabId: location.tabId,
            src: location.src,
        };
        chrome.runtime.sendMessage(command);
    }, [location]);

    const handleOffset = useCallback(
        (offset: number) => {
            if (!location) {
                return;
            }

            const command: AsbPlayerToVideoCommandV2<OffsetToVideoMessage> = {
                sender: 'asbplayerv2',
                message: { command: 'offset', value: offset, echo: true },
                tabId: location.tabId,
                src: location.src,
            };
            chrome.runtime.sendMessage(command);
        },
        [location]
    );

    const handleSeek = useCallback(
        (timestampMs: number) => {
            if (!location) {
                return;
            }

            const command: AsbPlayerToVideoCommandV2<CurrentTimeToVideoMessage> = {
                sender: 'asbplayerv2',
                message: { command: 'currentTime', value: timestampMs / 1000 },
                tabId: location.tabId,
                src: location.src,
            };
            chrome.runtime.sendMessage(command);
        },
        [location]
    );

    const handlePlaybackRate = useCallback(
        (playbackRate: number) => {
            if (!location) {
                return;
            }

            const command: AsbPlayerToVideoCommandV2<PlaybackRateToVideoMessage> = {
                sender: 'asbplayerv2',
                message: { command: 'playbackRate', value: playbackRate },
                tabId: location.tabId,
                src: location.src,
            };
            chrome.runtime.sendMessage(command);
        },
        [location]
    );

    const model = useMobileVideoOverlayModel({ location });

    const handlePlayModeSelected = useCallback(
        (playMode: PlayMode) => {
            if (!location) {
                return;
            }

            const command: MobileOverlayToVideoCommand<PlayModeMessage> = {
                sender: 'asbplayer-mobile-overlay-to-video',
                message: {
                    command: 'playMode',
                    playMode,
                },
                src: location.src,
            };
            chrome.runtime.sendMessage(command);
        },
        [location]
    );

    const handleToggleSubtitles = useCallback(() => {
        if (!location) {
            return;
        }

        const command: MobileOverlayToVideoCommand<ToggleSubtitlesMessage> = {
            sender: 'asbplayer-mobile-overlay-to-video',
            message: {
                command: 'toggle-subtitles',
            },
            src: location.src,
        };
        chrome.runtime.sendMessage(command);
    }, [location]);

    useEffect(() => {
        const scrollListener = () => {
            if (!location) {
                return;
            }

            if (!hiddenRef.current) {
                if (
                    (anchor === 'top' && document.body.scrollTop >= containerHeight) ||
                    (anchor === 'bottom' && document.body.scrollTop <= scrollBufferHeight)
                ) {
                    const command: MobileOverlayToVideoCommand<HiddenMessage> = {
                        sender: 'asbplayer-mobile-overlay-to-video',
                        message: {
                            command: 'hidden',
                        },
                        src: location.src,
                    };
                    chrome.runtime.sendMessage(command);
                    hiddenRef.current = true;
                }
            }
        };

        document.body.addEventListener('scrollend', scrollListener);
        return () => document.body.removeEventListener('scrollend', scrollListener);
    }, [location]);

    useEffect(() => {
        // Depending on anchor, the mobile overlay will be at the bottom or top of the scrolling buffer
        // We need to make sure the iframe is scrolled to the right place so that the overlay shows
        if (anchor === 'top') {
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        } else {
            document.documentElement.scrollTop = document.documentElement.scrollHeight;
            document.body.scrollTop = document.body.scrollHeight;
        }
    }, []);

    const { initialized: i18nInitialized } = useI18n({ language: model?.language ?? 'en' });

    if (!i18nInitialized) {
        return null;
    }

    return (
        <MobileVideoOverlay
            model={model}
            anchor={anchor}
            tooltipsEnabled={tooltipsEnabled}
            onMineSubtitle={handleMineSubtitle}
            onLoadSubtitles={handleLoadSubtitles}
            onOffset={handleOffset}
            onSeek={handleSeek}
            onPlaybackRate={handlePlaybackRate}
            onPlayModeSelected={handlePlayModeSelected}
            onToggleSubtitles={handleToggleSubtitles}
        />
    );
};

export default MobileVideoOverlayUi;
