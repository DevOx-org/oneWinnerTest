/**
 * Returns the image path for a given game name.
 * Images are stored in /public/images/games/.
 */
export const getGameImage = (gameName: string): string => {
    const images: Record<string, string> = {
        'PUBG': '/images/games/pubg.jpg',
        'Free Fire': '/images/games/freefire.jpeg',
        'Call of Duty': '/images/games/cod.jpg',
        'Valorant': '/images/heroes/valorant.png',
    };
    return images[gameName] || '/images/games/pubg.jpg';
};
