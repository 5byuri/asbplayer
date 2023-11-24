import ImageCapturer from '../../services/image-capturer';
import {
    Command,
    Message,
    VideoToExtensionCommand,
    ExtensionToVideoCommand,
    ScreenshotTakenMessage,
    TakeScreenshotFromExtensionMessage,
    AnkiUiSavedState,
} from '@project/common';
import { CardPublisher } from '../../services/card-publisher';

export default class TakeScreenshotHandler {
    private readonly _imageCapturer: ImageCapturer;
    private readonly _cardPublisher: CardPublisher;

    constructor(imageCapturer: ImageCapturer, cardPublisher: CardPublisher) {
        this._imageCapturer = imageCapturer;
        this._cardPublisher = cardPublisher;
    }

    get sender() {
        return 'asbplayer-video';
    }

    get command() {
        return 'take-screenshot';
    }

    async handle(command: Command<Message>, sender: chrome.runtime.MessageSender) {
        const senderTab = sender.tab!;
        const takeScreenshotCommand = command as VideoToExtensionCommand<TakeScreenshotFromExtensionMessage>;
        const { maxWidth, maxHeight, rect, frameId } = takeScreenshotCommand.message;
        const imageBase64 = await this._imageCapturer.capture(sender.tab!.id!, takeScreenshotCommand.src, 0, {
            maxWidth,
            maxHeight,
            rect,
            frameId,
        });

        let ankiUiState: AnkiUiSavedState | undefined;

        if (takeScreenshotCommand.message.ankiUiState) {
            ankiUiState = takeScreenshotCommand.message.ankiUiState;
            ankiUiState.image = {
                base64: imageBase64,
                extension: 'jpeg',
            };
            this._cardPublisher.publish(
                {
                    audio: ankiUiState.audio,
                    image: ankiUiState.image,
                    url: ankiUiState!.url,
                    subtitle: ankiUiState!.subtitle,
                    surroundingSubtitles: ankiUiState!.surroundingSubtitles,
                    subtitleFileName: takeScreenshotCommand.message.subtitleFileName,
                    mediaTimestamp: takeScreenshotCommand.message.mediaTimestamp,
                },
                undefined,
                senderTab.id!,
                takeScreenshotCommand.src
            );
        }

        const screenshotTakenCommand: ExtensionToVideoCommand<ScreenshotTakenMessage> = {
            sender: 'asbplayer-extension-to-video',
            message: {
                command: 'screenshot-taken',
                ankiUiState: ankiUiState,
            },
            src: takeScreenshotCommand.src,
        };

        chrome.tabs.sendMessage(senderTab.id!, screenshotTakenCommand);
    }
}
