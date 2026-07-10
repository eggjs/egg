import { Router } from '@eggjs/router';
import { InnerObjectProto } from '@eggjs/tegg';
import { AccessLevel } from '@eggjs/tegg-types';

@InnerObjectProto({ accessLevel: AccessLevel.PUBLIC })
export class FetchRouter extends Router {}
