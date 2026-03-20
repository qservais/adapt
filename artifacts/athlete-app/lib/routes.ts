import { router } from "expo-router";

export function navigateTo(path: Parameters<typeof router.push>[0]) {
  router.push(path);
}

export function replaceTo(path: Parameters<typeof router.replace>[0]) {
  router.replace(path);
}
