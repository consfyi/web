import { useController, useLoading } from "@data-client/react";
import { Trans, useLingui } from "@lingui/react/macro";
import { ActionIcon, type ActionIconProps, Tooltip } from "@mantine/core";
import { IconHeart, IconHeartFilled } from "@tabler/icons-react";
import { Post, useLikePost, useUnlikePost } from "~/endpoints";

export default function LikeButton({
  post,
  size,
  iconSize,
}: {
  post: Post;
  size?: ActionIconProps["size"];
  iconSize?: number;
}) {
  iconSize = iconSize ?? 16;

  const ctrl = useController();
  const likePost = useLikePost();
  const unlikePost = useUnlikePost();

  const { t } = useLingui();

  const isLiked = post.viewer?.like != null;

  const [handleToggleLike, loading] = useLoading(async () => {
    await ctrl.fetch(isLiked ? unlikePost : likePost, { uri: post.uri! });
  }, [ctrl, post, isLiked]);

  return (
    <Tooltip
      label={
        isLiked ? (
          <Trans context="like button">Going</Trans>
        ) : (
          <Trans context="like button">Not going</Trans>
        )
      }
    >
      <ActionIcon
        color={isLiked ? "var(--mantine-color-red-filled)" : "gray"}
        aria-pressed={isLiked}
        disabled={loading}
        aria-label={t`Toggle going`}
        variant="transparent"
        size={size}
        bg="none"
        onClick={() => {
          handleToggleLike();
        }}
      >
        {isLiked ? (
          <IconHeartFilled size={iconSize} />
        ) : (
          <IconHeart size={iconSize} />
        )}
      </ActionIcon>
    </Tooltip>
  );
}
